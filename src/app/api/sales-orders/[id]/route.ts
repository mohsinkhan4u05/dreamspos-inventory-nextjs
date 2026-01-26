import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { SalesOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(num) ? num : fallback;
}

type NormalizedSalesOrderItem = {
  productId: string;
  variantId: string | null;
  description: string | null;
  quantity: number;
  rate: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        store: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, sku: true } },
          },
        },
        invoices: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    let activities: any[] = [];
    if (order.customerId) {
      activities = await prisma.customerActivityLog.findMany({
        where: {
          customerId: order.customerId,
          entityType: "SALES_ORDER",
          entityId: order.id,
        },
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json({ ...order, activities });
  } catch (error) {
    console.error("Error fetching sales order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    if (
      existing.status === SalesOrderStatus.CLOSED ||
      existing.status === SalesOrderStatus.CANCELLED
    ) {
      return NextResponse.json(
        { error: "Closed or cancelled sales orders cannot be edited" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const itemsInput = Array.isArray(body.items) ? body.items : [];
    if (itemsInput.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 },
      );
    }

    const normalizedItems: NormalizedSalesOrderItem[] = itemsInput.map(
      (item: any): NormalizedSalesOrderItem => {
        const quantity = normalizeNumber(item.quantity);
        const rate = normalizeNumber(item.rate);
        const discount = normalizeNumber(item.discount);
        const taxRate = normalizeNumber(item.taxRate);
        const taxAmount = normalizeNumber(item.taxAmount);
        const lineTotal = quantity * rate - discount + taxAmount;

        return {
          productId: String(item.productId),
          variantId: item.variantId ? String(item.variantId) : null,
          description: item.description ?? null,
          quantity,
          rate,
          discount,
          taxRate,
          taxAmount,
          totalAmount: lineTotal,
        };
      },
    );

    const subtotal = normalizedItems.reduce<number>(
      (sum, item) => sum + item.quantity * item.rate,
      0,
    );

    // Validate variant usage: products with variants must have variantId, and it must belong
    const productIds = Array.from(
      new Set(normalizedItems.map((item) => item.productId)),
    );

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        isVariant: true,
        variants: {
          select: { id: true },
        },
      },
    });

    const productById = new Map(products.map((p) => [p.id, p]));

    for (const item of normalizedItems) {
      const product = productById.get(item.productId);
      if (!product) continue;

      const hasVariants =
        product.isVariant === true || (product.variants?.length ?? 0) > 0;

      if (hasVariants && !item.variantId) {
        return NextResponse.json(
          {
            error:
              "variantId is required for products that have variants in sales orders",
          },
          { status: 400 },
        );
      }

      if (item.variantId) {
        const belongsToProduct = product.variants?.some(
          (v) => v.id === item.variantId,
        );
        if (!belongsToProduct) {
          return NextResponse.json(
            {
              error:
                "variantId does not belong to the specified product for one of the sales order lines",
            },
            { status: 400 },
          );
        }
      }
    }

    const discount = normalizeNumber(body.discount);
    const taxAmount = normalizeNumber(body.taxAmount);
    const adjustment = normalizeNumber(body.adjustment);
    const totalAmount = subtotal - discount + taxAmount + adjustment;

    const rawStatus = body.status as SalesOrderStatus | undefined;
    const status =
      rawStatus && Object.values(SalesOrderStatus).includes(rawStatus)
        ? rawStatus
        : existing.status;

    const orderDate = body.orderDate ? new Date(body.orderDate) : existing.orderDate;
    const expectedShipmentDate = body.expectedShipmentDate
      ? new Date(body.expectedShipmentDate)
      : existing.expectedShipmentDate;

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: {
        customerId: (body.customerId as string | undefined) ?? existing.customerId,
        storeId: body.storeId ?? existing.storeId,
        referenceNumber: body.referenceNumber ?? existing.referenceNumber,
        orderDate,
        expectedShipmentDate,
        paymentTerms: body.paymentTerms ?? existing.paymentTerms,
        deliveryMethod: body.deliveryMethod ?? existing.deliveryMethod,
        salesperson: body.salesperson ?? existing.salesperson,
        subtotal,
        discount,
        taxAmount,
        adjustment,
        totalAmount,
        status,
        notes: body.notes ?? existing.notes,
        terms: body.terms ?? existing.terms,
        emailRecipients: body.emailRecipients ?? existing.emailRecipients,
        items: {
          deleteMany: {},
          create: normalizedItems,
        },
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        store: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating sales order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await prisma.salesOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sales order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status") as SalesOrderStatus | null;
    const customerId = searchParams.get("customerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (status && Object.values(SalesOrderStatus).includes(status)) {
      where.status = status;
    }

    if (startDate || endDate) {
      const createdAt: any = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          store: {
            select: { id: true, name: true, code: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              variant: { select: { id: true, name: true, sku: true } },
            },
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              dueAmount: true,
              paymentStatus: true,
            },
          },
          packages: {
            include: {
              shipments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching sales orders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const storeId = body.storeId as string | undefined;
    const customerId = (body.customerId as string | undefined) ?? null;
    const itemsInput = Array.isArray(body.items) ? body.items : [];

    if (!storeId || itemsInput.length === 0) {
      return NextResponse.json(
        { error: "storeId and at least one item are required" },
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
        : SalesOrderStatus.DRAFT;

    const orderNumber =
      typeof body.orderNumber === "string" && body.orderNumber.trim().length > 0
        ? body.orderNumber.trim()
        : `SO-${Date.now()}`;

    const orderDate = body.orderDate ? new Date(body.orderDate) : new Date();
    const expectedShipmentDate = body.expectedShipmentDate
      ? new Date(body.expectedShipmentDate)
      : null;

    const salesPersonName =
      (typeof body.salesperson === "string" && body.salesperson.trim().length > 0
        ? body.salesperson.trim()
        : null) ||
      (typeof token?.name === "string" && token.name.trim().length > 0
        ? token.name.trim()
        : null) ||
      (typeof token?.email === "string" && token.email.trim().length > 0
        ? token.email.trim()
        : null);

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId,
        storeId,
        referenceNumber: body.referenceNumber ?? null,
        orderDate,
        expectedShipmentDate,
        paymentTerms: body.paymentTerms ?? null,
        deliveryMethod: body.deliveryMethod ?? null,
        salesperson: salesPersonName,
        subtotal,
        discount,
        taxAmount,
        adjustment,
        totalAmount,
        status,
        notes: body.notes ?? null,
        terms: body.terms ?? null,
        emailRecipients: body.emailRecipients ?? null,
        items: {
          create: normalizedItems,
        },
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        store: {
          select: { id: true, name: true, code: true },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    return NextResponse.json(salesOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating sales order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

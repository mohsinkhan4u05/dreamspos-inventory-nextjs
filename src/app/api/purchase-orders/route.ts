import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { PurchaseOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(num) ? num : fallback;
}

type NormalizedPurchaseOrderItem = {
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
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status") as PurchaseOrderStatus | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (status && Object.values(PurchaseOrderStatus).includes(status)) {
      where.status = status;
    }

    if (startDate || endDate) {
      const orderDate: any = {};
      if (startDate) {
        orderDate.gte = new Date(startDate);
      }
      if (endDate) {
        orderDate.lte = new Date(endDate);
      }
      where.orderDate = orderDate;
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
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
    console.error("Error fetching purchase orders:", error);
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
    const supplierId = (body.supplierId as string | undefined) ?? null;
    const itemsInput = Array.isArray(body.items) ? body.items : [];

    if (!storeId || itemsInput.length === 0) {
      return NextResponse.json(
        { error: "storeId and at least one item are required" },
        { status: 400 },
      );
    }

    const normalizedItems: NormalizedPurchaseOrderItem[] = itemsInput.map(
      (item: any): NormalizedPurchaseOrderItem => {
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

    const discount = normalizeNumber(body.discount);
    const taxAmount = normalizeNumber(body.taxAmount);
    const adjustment = normalizeNumber(body.adjustment);
    const totalAmount = subtotal - discount + taxAmount + adjustment;

    const rawStatus = body.status as PurchaseOrderStatus | undefined;
    const status =
      rawStatus && Object.values(PurchaseOrderStatus).includes(rawStatus)
        ? rawStatus
        : PurchaseOrderStatus.DRAFT;

    const orderNumber =
      typeof body.orderNumber === "string" && body.orderNumber.trim().length > 0
        ? body.orderNumber.trim()
        : `PO-${Date.now()}`;

    const orderDate = body.orderDate ? new Date(body.orderDate) : new Date();
    const expectedReceiptDate = body.expectedReceiptDate
      ? new Date(body.expectedReceiptDate)
      : null;

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        storeId,
        referenceNumber: body.referenceNumber ?? null,
        orderDate,
        expectedReceiptDate,
        paymentTerms: body.paymentTerms ?? null,
        deliveryMethod: body.deliveryMethod ?? null,
        buyer: body.buyer ?? null,
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
        supplier: {
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

    if (supplierId) {
      try {
        await prisma.supplierActivityLog.create({
          data: {
            supplierId,
            type: "PURCHASE_ORDER_CREATED",
            title: "Purchase order created",
            description: `Purchase order ${purchaseOrder.orderNumber} created`,
            entityType: "PURCHASE_ORDER",
            entityId: purchaseOrder.id,
          },
        });
      } catch (err) {
        console.error("Failed to log supplier activity for purchase order", err);
      }
    }

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

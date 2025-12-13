import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { PurchaseReceiveStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(num) ? num : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search") || "";
    const storeId = searchParams.get("storeId");
    const supplierId = searchParams.get("supplierId");
    const purchaseOrderId = searchParams.get("purchaseOrderId");
    const status = searchParams.get("status") as PurchaseReceiveStatus | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (search) {
      where.OR = [
        { receiveNumber: { contains: search, mode: "insensitive" } },
        {
          purchaseOrder: {
            orderNumber: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }

    if (status && Object.values(PurchaseReceiveStatus).includes(status)) {
      where.status = status;
    }

    if (startDate || endDate) {
      const receiveDate: any = {};
      if (startDate) {
        receiveDate.gte = new Date(startDate);
      }
      if (endDate) {
        receiveDate.lte = new Date(endDate);
      }
      where.receiveDate = receiveDate;
    }

    const [receives, total] = await Promise.all([
      prisma.purchaseReceive.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, email: true, phone: true },
          },
          store: {
            select: { id: true, name: true, code: true },
          },
          purchaseOrder: {
            select: { id: true, orderNumber: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              purchaseOrderItem: {
                select: { id: true, quantity: true, receivedQuantity: true },
              },
            },
          },
        },
        orderBy: { receiveDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseReceive.count({ where }),
    ]);

    return NextResponse.json({
      data: receives,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching purchase receives:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface CreateReceiveItemInput {
  purchaseOrderItemId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const purchaseOrderId = body.purchaseOrderId as string | undefined;
    const rawItems = Array.isArray(body.items)
      ? (body.items as CreateReceiveItemInput[])
      : [];

    if (!purchaseOrderId || rawItems.length === 0) {
      return NextResponse.json(
        { error: "purchaseOrderId and at least one item are required" },
        { status: 400 },
      );
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 },
      );
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        { error: "This purchase order has no items to receive." },
        { status: 400 },
      );
    }

    const remainingById = new Map<string, number>();
    for (const item of order.items) {
      const remaining = item.quantity - item.receivedQuantity;
      if (remaining > 0) {
        remainingById.set(item.id, remaining);
      }
    }

    if (remainingById.size === 0) {
      return NextResponse.json(
        {
          error:
            "All items are already fully received for this purchase order.",
        },
        { status: 400 },
      );
    }

    type ReceiveLine = {
      purchaseOrderItemId: string;
      productId: string;
      quantity: number;
      unitCost: number;
      discount: number;
      taxRate: number;
      taxAmount: number;
      totalPrice: number;
    };

    const lines: ReceiveLine[] = [];

    for (const input of rawItems) {
      const baseItem = order.items.find((i) => i.id === input.purchaseOrderItemId);
      if (!baseItem) {
        return NextResponse.json(
          {
            error:
              "One or more selected items could not be found for this purchase order.",
          },
          { status: 400 },
        );
      }

      const remaining = remainingById.get(baseItem.id) ?? 0;
      const qty = normalizeNumber(input.quantity, 0);

      if (qty <= 0) {
        continue;
      }

      if (qty > remaining) {
        return NextResponse.json(
          {
            error:
              "Received quantity exceeds the remaining quantity for one or more items.",
          },
          { status: 400 },
        );
      }

      const discountPerUnit =
        baseItem.quantity > 0 ? baseItem.discount / baseItem.quantity : 0;
      const taxPerUnit =
        baseItem.quantity > 0 ? baseItem.taxAmount / baseItem.quantity : 0;

      const subtotal = qty * baseItem.rate;
      const lineDiscount = discountPerUnit * qty;
      const lineTax = taxPerUnit * qty;
      const totalPrice = subtotal - lineDiscount + lineTax;

      lines.push({
        purchaseOrderItemId: baseItem.id,
        productId: baseItem.productId,
        quantity: qty,
        unitCost: baseItem.rate,
        discount: lineDiscount,
        taxRate: baseItem.taxRate,
        taxAmount: lineTax,
        totalPrice,
      });
    }

    if (lines.length === 0) {
      return NextResponse.json(
        {
          error: "Please enter a quantity to receive for at least one item.",
        },
        { status: 400 },
      );
    }

    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
    const totalDiscount = lines.reduce((sum, line) => sum + line.discount, 0);
    const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);
    const totalAmount = subtotal - totalDiscount + totalTax;

    const receiveNumber = `GRN-${Date.now()}`;

    const receiveDate = body.receiveDate
      ? new Date(body.receiveDate)
      : new Date();

    const receive = await prisma.purchaseReceive.create({
      data: {
        receiveNumber,
        purchaseOrderId: order.id,
        supplierId: order.supplierId ?? null,
        storeId: order.storeId,
        subtotal,
        discount: totalDiscount,
        taxAmount: totalTax,
        totalAmount,
        status: PurchaseReceiveStatus.DRAFT,
        notes: body.notes ?? null,
        receiveDate,
        items: {
          create: lines.map((line) => ({
            purchaseOrderItemId: line.purchaseOrderItemId,
            productId: line.productId,
            quantity: line.quantity,
            unitCost: line.unitCost,
            totalPrice: line.totalPrice,
            discount: line.discount,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
          })),
        },
      },
      include: {
        supplier: {
          select: { id: true, name: true, email: true, phone: true },
        },
        store: {
          select: { id: true, name: true, code: true },
        },
        purchaseOrder: {
          select: { id: true, orderNumber: true },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            purchaseOrderItem: {
              select: { id: true, quantity: true, receivedQuantity: true },
            },
          },
        },
      },
    });

    return NextResponse.json(receive, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase receive:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

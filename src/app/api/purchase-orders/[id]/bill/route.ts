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

interface BillItemInput {
  purchaseOrderItemId: string;
  quantity: number;
}

interface BillBody {
  items?: BillItemInput[];
  notes?: string | null;
  billNumber?: string | null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: BillBody = await request
      .json()
      .catch(() => ({}) as BillBody);

    const itemsInput: BillItemInput[] = Array.isArray(body.items)
      ? body.items
      : [];

    const { id } = await context.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 },
      );
    }

    if (
      order.status === PurchaseOrderStatus.CANCELLED ||
      order.status === PurchaseOrderStatus.CLOSED ||
      order.status === PurchaseOrderStatus.BILLED
    ) {
      return NextResponse.json(
        {
          error: `You can't bill this purchase order in its current status (${order.status}).`,
        },
        { status: 400 },
      );
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        { error: "This purchase order has no items to bill." },
        { status: 400 },
      );
    }

    const remainingById = new Map<string, number>();
    for (const item of order.items) {
      const remaining = item.quantity - item.billedQuantity;
      if (remaining > 0) {
        remainingById.set(item.id, remaining);
      }
    }

    if (remainingById.size === 0) {
      return NextResponse.json(
        { error: "All items are already fully billed for this purchase order." },
        { status: 400 },
      );
    }

    type BillLine = {
      purchaseOrderItemId: string;
      quantity: number;
    };

    const lines: BillLine[] = [];

    if (itemsInput.length > 0) {
      // Use explicit quantities from request
      for (const input of itemsInput) {
        const baseItem = order.items.find(
          (i) => i.id === input.purchaseOrderItemId,
        );
        if (!baseItem) {
          return NextResponse.json(
            { error: "One or more selected items could not be found for this purchase order." },
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
                "Billed quantity exceeds the remaining quantity for one or more items.",
            },
            { status: 400 },
          );
        }

        lines.push({
          purchaseOrderItemId: baseItem.id,
          quantity: qty,
        });
      }
    } else {
      // Auto-bill all remaining quantities
      for (const item of order.items) {
        const remaining = remainingById.get(item.id) ?? 0;
        if (remaining <= 0) continue;

        lines.push({
          purchaseOrderItemId: item.id,
          quantity: remaining,
        });
      }
    }

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "Please enter a quantity to bill for at least one item." },
        { status: 400 },
      );
    }

    // Update billed quantities on the purchase order items
    for (const line of lines) {
      await prisma.purchaseOrderItem.update({
        where: { id: line.purchaseOrderItemId },
        data: {
          billedQuantity: {
            increment: line.quantity,
          },
        },
      });
    }

    // Re-evaluate order status based on updated billed quantities
    const updatedItems = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: order.id },
    });

    const allFullyBilled = updatedItems.every(
      (item) => item.billedQuantity >= item.quantity,
    );

    const newStatus = allFullyBilled
      ? PurchaseOrderStatus.BILLED
      : PurchaseOrderStatus.PARTIALLY_BILLED;

    await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: newStatus,
      },
    });

    if (order.supplierId) {
      try {
        await prisma.supplierActivityLog.create({
          data: {
            supplierId: order.supplierId,
            type: allFullyBilled
              ? "PURCHASE_ORDER_BILLED"
              : "PURCHASE_ORDER_PARTIALLY_BILLED",
            title: allFullyBilled
              ? "Purchase order billed"
              : "Purchase order partially billed",
            description:
              body.billNumber
                ? `Bill ${body.billNumber} recorded for purchase order ${order.orderNumber}`
                : `Purchase order ${order.orderNumber} billed`,
            entityType: "PURCHASE_ORDER",
            entityId: order.id,
          },
        });
      } catch (err) {
        console.error(
          "Failed to log supplier activity for purchase order billing",
          err,
        );
      }
    }

    return NextResponse.json({
      purchaseOrderId: order.id,
      status: newStatus,
      itemsBilled: lines.map((l) => ({
        purchaseOrderItemId: l.purchaseOrderItemId,
        quantity: l.quantity,
      })),
    });
  } catch (error) {
    console.error("Error billing purchase order:", error);
    return NextResponse.json(
      { error: "Something went wrong while billing this purchase order." },
      { status: 500 },
    );
  }
}

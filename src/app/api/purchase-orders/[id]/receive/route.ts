import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { applyPurchaseReceive } from "@/lib/stockEngine";
import { logPurchaseReceiveAccountingEntry } from "@/lib/accountingEngine";
import { PurchaseOrderStatus, PurchaseReceiveStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(num) ? num : fallback;
}

interface ReceiveItemInput {
  purchaseOrderItemId: string;
  quantity: number;
  batch?: {
    batchNumber?: string | null;
    manufacturingDate?: string | null;
    expiryDate?: string | null;
  };
}

interface ReceiveBody {
  items?: ReceiveItemInput[];
  notes?: string | null;
  expectedDate?: string | null;
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

    const body: ReceiveBody = await request
      .json()
      .catch(() => ({}) as ReceiveBody);

    const itemsInput: ReceiveItemInput[] = Array.isArray(body.items)
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
          error: `You can't receive this purchase order in its current status (${order.status}).`,
        },
        { status: 400 },
      );
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        { error: "This purchase order has no items to receive." },
        { status: 400 },
      );
    }

    // Build remaining quantity map per item
    const remainingById = new Map<string, number>();
    for (const item of order.items) {
      const remaining = item.quantity - item.receivedQuantity;
      if (remaining > 0) {
        remainingById.set(item.id, remaining);
      }
    }

    if (remainingById.size === 0) {
      return NextResponse.json(
        { error: "All items are already fully received for this purchase order." },
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
      batch?: {
        batchNumber?: string | null;
        manufacturingDate?: string | null;
        expiryDate?: string | null;
      };
    };

    const lines: ReceiveLine[] = [];

    if (itemsInput.length > 0) {
      // Use explicit quantities from request
      for (const input of itemsInput) {
        const baseItem = order.items.find((i) => i.id === input.purchaseOrderItemId);
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
                "Received quantity exceeds the remaining quantity for one or more items.",
            },
            { status: 400 },
          );
        }

        lines.push({
          purchaseOrderItemId: baseItem.id,
          productId: baseItem.productId,
          quantity: qty,
          unitCost: baseItem.rate,
          discount: baseItem.discount,
          taxRate: baseItem.taxRate,
          taxAmount: baseItem.taxAmount,
          batch: input.batch,
        });
      }
    } else {
      // Auto-receive all remaining quantities
      for (const item of order.items) {
        const remaining = remainingById.get(item.id) ?? 0;
        if (remaining <= 0) continue;

        lines.push({
          purchaseOrderItemId: item.id,
          productId: item.productId,
          quantity: remaining,
          unitCost: item.rate,
          discount: item.discount,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          // No explicit batch info when auto-receiving remaining quantities
        });
      }
    }

    if (lines.length === 0) {
      return NextResponse.json(
        {
          error: "Please enter a quantity to receive for at least one item.",
        },
        { status: 400 },
      );
    }

    const subtotal = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitCost,
      0,
    );
    const totalDiscount = lines.reduce(
      (sum, line) => sum + line.discount,
      0,
    );
    const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);
    const totalAmount = subtotal - totalDiscount + totalTax;

    const receiveNumber = `GRN-${Date.now()}`;

    const result = await prisma.$transaction(async (tx) => {
      const receive = await tx.purchaseReceive.create({
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
          notes:
            body.notes ??
            `Auto-created from Purchase Order ${order.orderNumber}`,
          receiveDate: body.expectedDate
            ? new Date(body.expectedDate)
            : order.expectedReceiptDate ?? new Date(),
          items: {
            create: lines.map((line) => ({
              purchaseOrderItemId: line.purchaseOrderItemId,
              productId: line.productId,
              quantity: line.quantity,
              unitCost: line.unitCost,
              totalPrice: line.quantity * line.unitCost,
              discount: line.discount,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
              // Batch metadata is handled by stockEngine via batchOverride
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await applyPurchaseReceive(tx, {
        storeId: order.storeId,
        reference: receive.receiveNumber,
        descriptionPrefix: "Receive",
        items: receive.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalPrice: item.totalPrice,
          sourceId: receive.id,
          sourceItemId: item.id,
          batchOverride: lines.find(
            (l) => l.purchaseOrderItemId === item.purchaseOrderItemId,
          )?.batch,
        })),
      });

      await logPurchaseReceiveAccountingEntry(tx, {
        storeId: order.storeId,
        amount: totalAmount,
        purchaseReceiveId: receive.id,
        purchaseOrderId: order.id,
        purchaseId: null,
        narration: `GRN ${receive.receiveNumber} for PO ${order.orderNumber}`,
      });

      for (const item of receive.items) {
        if (!item.purchaseOrderItemId) continue;

        await tx.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: {
            receivedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: order.id },
      });

      const allFullyReceived = updatedItems.every(
        (item) => item.receivedQuantity >= item.quantity,
      );

      const newStatus = allFullyReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIALLY_RECEIVED;

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: newStatus,
        },
      });

      if (order.supplierId) {
        try {
          await tx.supplierActivityLog.create({
            data: {
              supplierId: order.supplierId,
              type: allFullyReceived
                ? "PURCHASE_ORDER_RECEIVED"
                : "PURCHASE_ORDER_PARTIALLY_RECEIVED",
              title: allFullyReceived
                ? "Purchase order received"
                : "Purchase order partially received",
              description: `Purchase order ${order.orderNumber} received via GRN ${receive.receiveNumber}`,
              entityType: "PURCHASE_ORDER",
              entityId: order.id,
            },
          });
        } catch (err) {
          console.error(
            "Failed to log supplier activity for purchase order receipt via GRN",
            err,
          );
        }
      }

      await tx.purchaseReceive.update({
        where: { id: receive.id },
        data: {
          status: PurchaseReceiveStatus.POSTED,
        },
      });

      return {
        receiveId: receive.id,
        status: newStatus,
      };
    });

    return NextResponse.json({
      purchaseReceiveId: result.receiveId,
      purchaseOrderId: order.id,
      status: result.status,
      itemsReceived: lines.map((l) => ({
        purchaseOrderItemId: l.purchaseOrderItemId,
        quantity: l.quantity,
      })),
    });
  } catch (error) {
    console.error("Error receiving purchase order:", error);
    return NextResponse.json(
      { error: "Something went wrong while receiving this purchase order." },
      { status: 500 },
    );
  }
}

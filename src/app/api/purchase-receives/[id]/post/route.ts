import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  MovementSourceType,
  PurchaseOrderStatus,
  PurchaseReceiveStatus,
} from "@prisma/client";
import { applyPurchaseReceive } from "@/lib/stockEngine";
import { logPurchaseReceiveAccountingEntry } from "@/lib/accountingEngine";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const receive = await prisma.purchaseReceive.findUnique({
      where: { id },
      include: {
        items: true,
        purchaseOrder: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!receive) {
      return NextResponse.json(
        { error: "Purchase receive not found" },
        { status: 404 },
      );
    }

    if (
      receive.status === PurchaseReceiveStatus.POSTED ||
      receive.status === PurchaseReceiveStatus.CANCELLED
    ) {
      return NextResponse.json(
        { error: "This purchase receive has already been posted or cancelled." },
        { status: 400 },
      );
    }

    if (receive.items.length === 0) {
      return NextResponse.json(
        { error: "This purchase receive has no items to post." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await applyPurchaseReceive(tx, {
        storeId: receive.storeId,
        reference: receive.receiveNumber,
        descriptionPrefix: "Receive",
        sourceType: MovementSourceType.PURCHASE,
        items: receive.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalPrice: item.totalPrice,
          sourceId: receive.id,
          sourceItemId: item.id,
          batchOverride: {
            batchNumber: item.batchNumber,
            manufacturingDate: item.batchMfgDate ?? undefined,
            expiryDate: item.batchExpiryDate ?? undefined,
          },
        })),
      });

      await logPurchaseReceiveAccountingEntry(tx, {
        storeId: receive.storeId,
        amount: receive.totalAmount,
        purchaseReceiveId: receive.id,
        purchaseOrderId: receive.purchaseOrderId ?? null,
        purchaseId: null,
        narration: `GRN ${receive.receiveNumber}`,
      });

      if (receive.purchaseOrderId && receive.purchaseOrder) {
        const order = receive.purchaseOrder;

        for (const line of receive.items) {
          if (!line.purchaseOrderItemId) continue;

          await tx.purchaseOrderItem.update({
            where: { id: line.purchaseOrderItemId },
            data: {
              receivedQuantity: {
                increment: line.quantity,
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
      }

      await tx.purchaseReceive.update({
        where: { id: receive.id },
        data: {
          status: PurchaseReceiveStatus.POSTED,
        },
      });
    });

    return NextResponse.json({
      purchaseReceiveId: receive.id,
      status: PurchaseReceiveStatus.POSTED,
    });
  } catch (error) {
    console.error("Error posting purchase receive:", error);
    return NextResponse.json(
      { error: "Something went wrong while posting this purchase receive." },
      { status: 500 },
    );
  }
}

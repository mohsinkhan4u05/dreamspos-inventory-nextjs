import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { PurchaseOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

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
      order.status === PurchaseOrderStatus.CLOSED
    ) {
      return NextResponse.json(
        {
          error: `This purchase order is already ${order.status.toLowerCase()}.`,
        },
        { status: 400 },
      );
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        { error: "This purchase order has no items to close." },
        { status: 400 },
      );
    }

    const allFullyReceived = order.items.every(
      (item) => item.receivedQuantity >= item.quantity,
    );

    const allFullyBilled = order.items.every(
      (item) => item.billedQuantity >= item.quantity,
    );

    if (!allFullyReceived || !allFullyBilled) {
      return NextResponse.json(
        {
          error:
            "You can only close a purchase order after all items are fully received and billed.",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: PurchaseOrderStatus.CLOSED,
      },
    });

    if (order.supplierId) {
      try {
        await prisma.supplierActivityLog.create({
          data: {
            supplierId: order.supplierId,
            type: "PURCHASE_ORDER_CLOSED",
            title: "Purchase order closed",
            description: `Purchase order ${order.orderNumber} closed`,
            entityType: "PURCHASE_ORDER",
            entityId: order.id,
          },
        });
      } catch (err) {
        console.error(
          "Failed to log supplier activity for purchase order close",
          err,
        );
      }
    }

    return NextResponse.json({
      purchaseOrderId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error closing purchase order:", error);
    return NextResponse.json(
      { error: "Something went wrong while closing this purchase order." },
      { status: 500 },
    );
  }
}

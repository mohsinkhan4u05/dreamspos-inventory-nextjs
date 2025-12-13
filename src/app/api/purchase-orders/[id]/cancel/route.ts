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

    if (
      order.status === PurchaseOrderStatus.RECEIVED ||
      order.status === PurchaseOrderStatus.BILLED
    ) {
      return NextResponse.json(
        {
          error:
            "You can't cancel this purchase order after it has been fully received or billed.",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
      },
    });

    if (order.supplierId) {
      try {
        await prisma.supplierActivityLog.create({
          data: {
            supplierId: order.supplierId,
            type: "PURCHASE_ORDER_CANCELLED",
            title: "Purchase order cancelled",
            description: `Purchase order ${order.orderNumber} cancelled`,
            entityType: "PURCHASE_ORDER",
            entityId: order.id,
          },
        });
      } catch (err) {
        console.error(
          "Failed to log supplier activity for purchase order cancel",
          err,
        );
      }
    }

    return NextResponse.json({
      purchaseOrderId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error cancelling purchase order:", error);
    return NextResponse.json(
      { error: "Something went wrong while cancelling this purchase order." },
      { status: 500 },
    );
  }
}

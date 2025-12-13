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

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      return NextResponse.json(
        {
          error:
            "Only draft purchase orders can be opened. Please change the status in the details view.",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: PurchaseOrderStatus.OPEN,
      },
    });

    if (order.supplierId) {
      try {
        await prisma.supplierActivityLog.create({
          data: {
            supplierId: order.supplierId,
            type: "PURCHASE_ORDER_OPENED",
            title: "Purchase order opened",
            description: `Purchase order ${order.orderNumber} opened`,
            entityType: "PURCHASE_ORDER",
            entityId: order.id,
          },
        });
      } catch (err) {
        console.error(
          "Failed to log supplier activity for purchase order open",
          err,
        );
      }
    }

    return NextResponse.json({
      purchaseOrderId: updated.id,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error opening purchase order:", error);
    return NextResponse.json(
      { error: "Something went wrong while opening this purchase order." },
      { status: 500 },
    );
  }
}

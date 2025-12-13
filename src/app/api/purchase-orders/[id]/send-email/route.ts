import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { PurchaseOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

interface SendEmailBody {
  to?: string;
  subject?: string;
  message?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const body: SendEmailBody = await request
      .json()
      .catch(() => ({} as SendEmailBody));

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: {
          select: { id: true, name: true, email: true },
        },
        store: {
          select: { id: true, name: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 },
      );
    }

    const fallbackTo =
      order.emailRecipients || order.supplier?.email || undefined;
    const to = (body.to || fallbackTo || "").trim();

    if (!to) {
      return NextResponse.json(
        {
          error:
            "No recipient email is configured. Please provide at least one email address.",
        },
        { status: 400 },
      );
    }

    const subject =
      body.subject ||
      `Purchase Order #${order.orderNumber} from ${order.store?.name || "Store"}`;

    const message =
      body.message ||
      `Purchase Order #${order.orderNumber} has been issued by ${
        order.store?.name || "your store"
      }.`;

    // NOTE: Actual email sending should be wired to your configured mail provider.
    // For now, we simply log the intent and mark the order as issued (OPEN).
    console.log("Sending purchase order email", {
      to,
      subject,
      message,
      orderId: order.id,
    });

    const updated = await prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: PurchaseOrderStatus.OPEN,
        emailRecipients: to,
      },
    });

    if (order.supplierId) {
      try {
        await prisma.supplierActivityLog.create({
          data: {
            supplierId: order.supplierId,
            type: "PURCHASE_ORDER_SENT",
            title: "Purchase order sent",
            description: `Purchase order ${order.orderNumber} sent to ${to}`,
            entityType: "PURCHASE_ORDER",
            entityId: order.id,
          },
        });
      } catch (err) {
        console.error(
          "Failed to log supplier activity for purchase order send email",
          err,
        );
      }
    }

    return NextResponse.json({
      purchaseOrderId: updated.id,
      status: updated.status,
      to,
      subject,
    });
  } catch (error) {
    console.error("Error sending purchase order email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

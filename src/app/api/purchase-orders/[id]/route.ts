import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, email: true, phone: true } },
        store: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    let activities: unknown[] = [];
    if (order.supplierId) {
      activities = await prisma.supplierActivityLog.findMany({
        where: {
          supplierId: order.supplierId,
          entityType: "PURCHASE_ORDER",
          entityId: order.id,
        },
        orderBy: { createdAt: "asc" },
      });
    }

    const [grnCount, billCount, bills] = await Promise.all([
      prisma.purchaseReceive.count({
        where: { purchaseOrderId: id },
      }),
      prisma.accountingEntry.count({
        where: {
          purchaseOrderId: id,
          type: "PURCHASE_BILL",
        },
      }),
      prisma.purchase.findMany({
        where: {
          accountingEntries: {
            some: {
              purchaseOrderId: id,
              type: "PURCHASE_BILL",
            },
          },
        },
        select: {
          id: true,
          paymentStatus: true,
          dueAmount: true,
          totalAmount: true,
        },
      }),
    ]);

    const hasUnpaidBill = bills.some((bill) => {
      const dueAmount = bill.dueAmount ?? 0;
      return bill.paymentStatus !== "PAID" && dueAmount > 0;
    });

    return NextResponse.json({
      ...order,
      activities,
      grnCount,
      billCount,
      hasUnpaidBill,
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

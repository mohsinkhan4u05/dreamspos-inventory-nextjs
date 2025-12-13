import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { SalesOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = token.sub as string | undefined;
    let actorName = "System";

    if (userId) {
      const actor = await prisma.user.findUnique({ where: { id: userId } });
      if (actor) {
        const fullName = [actor.firstName, actor.lastName]
          .filter((part) => part && part.trim().length > 0)
          .join(" ")
          .trim();
        actorName = fullName || actor.username || actor.email || actorName;
      }
    }

    const { id } = await context.params;

    const order = await prisma.salesOrder.update({
      where: { id },
      data: { status: SalesOrderStatus.CONFIRMED },
      include: {
        customer: true,
      },
    });

    if (order.customerId) {
      try {
        await prisma.customerActivityLog.create({
          data: {
            customerId: order.customerId,
            type: "SALES_ORDER_REOPENED",
            title: "Sales order reopened",
            description: `Sales order ${order.orderNumber} was reopened by ${actorName}`,
            entityType: "SALES_ORDER",
            entityId: order.id,
          },
        });
      } catch (logError) {
        console.error("Failed to write sales order reopen activity:", logError);
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error reopening sales order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

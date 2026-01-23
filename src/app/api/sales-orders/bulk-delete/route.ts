import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";

export const dynamic = "force-dynamic";

async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No sales order ids provided" },
        { status: 400 },
      );
    }

    // Soft delete: mark as CANCELLED if not already
    await prisma.salesOrder.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status: "CANCELLED" as any,
      },
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("Error bulk-deleting sales orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withPermission(
  "sales",
  "delete",
  handler,
);

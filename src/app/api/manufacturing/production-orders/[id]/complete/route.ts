import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/rbac/middleware";
import type { AuthenticatedUser } from "@/lib/rbac/middleware";
import { completeProductionOrder, InsufficientStockError } from "@/lib/stockEngine";

export const dynamic = "force-dynamic";

export const POST = withPermission(
  "manufacturing",
  "complete",
  async (
    request: NextRequest,
    user: AuthenticatedUser,
    context: { params: { id: string } | Promise<{ id: string }> },
  ) => {
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Production order id is required" }, { status: 400 });
    }

    try {
      const updated = await completeProductionOrder({
        productionOrderId: id,
        userId: user.id,
      });

      return NextResponse.json(updated, { status: 200 });
    } catch (error: any) {
      if (error instanceof InsufficientStockError) {
        return NextResponse.json({ error: "INSUFFICIENT_STOCK" }, { status: 400 });
      }

      if (error?.message === "PRODUCTION_ORDER_ALREADY_COMPLETED") {
        return NextResponse.json({ error: "Production order already completed" }, { status: 400 });
      }

      if (error?.message === "PRODUCTION_ORDER_CANCELLED") {
        return NextResponse.json({ error: "Production order is cancelled" }, { status: 400 });
      }

      if (error?.message === "BOM_NOT_DEFINED_FOR_PRODUCT") {
        return NextResponse.json({ error: "BOM not defined for finished product" }, { status: 400 });
      }

      if (error?.message === "PRODUCTION_ORDER_NOT_FOUND") {
        return NextResponse.json({ error: "Production order not found" }, { status: 404 });
      }

      console.error("Error completing production order:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
);

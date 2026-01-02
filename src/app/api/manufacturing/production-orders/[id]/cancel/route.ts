import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductionStatus } from "@prisma/client";
import { withPermission } from "@/lib/rbac/middleware";
import type { AuthenticatedUser } from "@/lib/rbac/middleware";

export const dynamic = "force-dynamic";

export const POST = withPermission(
  "manufacturing",
  "cancel",
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

    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        finishedProduct: {
          select: { id: true, name: true, sku: true },
        },
        store: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Production order not found" }, { status: 404 });
    }

    if (order.status === ProductionStatus.COMPLETED) {
      return NextResponse.json(
        { error: "Production order already completed" },
        { status: 400 },
      );
    }

    if (order.status === ProductionStatus.CANCELLED) {
      return NextResponse.json(
        { error: "Production order already cancelled" },
        { status: 400 },
      );
    }

    const updated = await prisma.productionOrder.update({
      where: { id },
      data: {
        status: ProductionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        finishedProduct: {
          select: { id: true, name: true, sku: true },
        },
        store: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json(updated, { status: 200 });
  },
);

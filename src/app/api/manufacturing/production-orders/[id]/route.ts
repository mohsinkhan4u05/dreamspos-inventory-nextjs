import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MovementSourceType } from "@prisma/client";
import { withPermission } from "@/lib/rbac/middleware";
import type { AuthenticatedUser } from "@/lib/rbac/middleware";

export const dynamic = "force-dynamic";

export const GET = withPermission(
  "manufacturing",
  "read",
  async (
    request: NextRequest,
    user: AuthenticatedUser,
    context: { params: { id: string } },
  ) => {
    const { id } = context.params;

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
        consumptions: {
          include: {
            rawMaterial: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Production order not found" }, { status: 404 });
    }

    const movements = await prisma.stockMovement.findMany({
      where: {
        sourceType: MovementSourceType.PRODUCTION,
        sourceId: id,
      },
      orderBy: { createdAt: "asc" },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        store: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return NextResponse.json({ order, movements });
  },
);

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/rbac/middleware";
import type { AuthenticatedUser } from "@/lib/rbac/middleware";

export const dynamic = "force-dynamic";

export const GET = withPermission(
  "manufacturing",
  "read",
  async (request: NextRequest, user: AuthenticatedUser, context: { params: { productId: string } }) => {
    const { productId } = context.params;

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const items = await prisma.billOfMaterial.findMany({
      where: { finishedProductId: productId },
      include: {
        rawMaterial: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({ finishedProductId: productId, items });
  },
);

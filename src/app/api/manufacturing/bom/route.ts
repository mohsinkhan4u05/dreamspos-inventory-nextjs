import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductionStatus } from "@prisma/client";
import { withPermission } from "@/lib/rbac/middleware";
import type { AuthenticatedUser } from "@/lib/rbac/middleware";

export const dynamic = "force-dynamic";

type NormalizedBomItem = {
  rawMaterialId: string;
  quantityRequired: number;
  unitId: string;
};

export const POST = withPermission(
  "manufacturing",
  "create",
  async (request: NextRequest, user: AuthenticatedUser) => {
    const body = await request.json();

    const finishedProductId = body.finishedProductId as string | undefined;
    const itemsInput = Array.isArray(body.items) ? body.items : [];

    if (!finishedProductId || itemsInput.length === 0) {
      return NextResponse.json(
        { error: "finishedProductId and at least one item are required" },
        { status: 400 },
      );
    }

    const normalized: NormalizedBomItem[] = [];
    const seenRawMaterials = new Set<string>();

    for (const item of itemsInput) {
      const rawMaterialId = String(item.rawMaterialId || "").trim();
      const unitId = String(item.unitId || "").trim();
      const quantityRequired = Number(item.quantityRequired ?? 0);

      if (!rawMaterialId || !unitId || !Number.isFinite(quantityRequired) || quantityRequired <= 0) {
        return NextResponse.json(
          { error: "Each item must have rawMaterialId, unitId and positive quantityRequired" },
          { status: 400 },
        );
      }

      if (seenRawMaterials.has(rawMaterialId)) {
        return NextResponse.json(
          { error: "Duplicate raw material in BOM is not allowed" },
          { status: 400 },
        );
      }

      seenRawMaterials.add(rawMaterialId);
      normalized.push({ rawMaterialId, unitId, quantityRequired });
    }

    const existingProductionCount = await prisma.productionOrder.count({
      where: {
        finishedProductId,
        status: {
          in: [ProductionStatus.IN_PROGRESS, ProductionStatus.COMPLETED],
        },
      },
    });

    if (existingProductionCount > 0) {
      return NextResponse.json(
        { error: "Cannot modify BOM because production orders already exist for this product" },
        { status: 400 },
      );
    }

    const bomItems = await prisma.$transaction(async (tx) => {
      await tx.billOfMaterial.deleteMany({ where: { finishedProductId } });

      const created = await Promise.all(
        normalized.map((item) =>
          tx.billOfMaterial.create({
            data: {
              finishedProductId,
              rawMaterialId: item.rawMaterialId,
              quantityRequired: item.quantityRequired,
              unitId: item.unitId,
            },
          }),
        ),
      );

      return created;
    });

    return NextResponse.json({ finishedProductId, items: bomItems }, { status: 200 });
  },
);

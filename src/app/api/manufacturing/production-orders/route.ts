import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductionStatus } from "@prisma/client";
import { withPermission } from "@/lib/rbac/middleware";
import type { AuthenticatedUser } from "@/lib/rbac/middleware";

export const dynamic = "force-dynamic";

export const GET = withPermission(
  "manufacturing",
  "read",
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const storeId = searchParams.get("storeId") || undefined;
    const status = searchParams.get("status") as ProductionStatus | null;
    const finishedProductId = searchParams.get("finishedProductId") || undefined;

    const where: any = {};

    if (storeId) {
      where.storeId = storeId;
    }

    if (finishedProductId) {
      where.finishedProductId = finishedProductId;
    }

    if (status && Object.values(ProductionStatus).includes(status)) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.productionOrder.findMany({
        where,
        include: {
          finishedProduct: {
            select: { id: true, name: true, sku: true },
          },
          store: {
            select: { id: true, name: true, code: true },
          },
          consumptions: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productionOrder.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  },
);

export const POST = withPermission(
  "manufacturing",
  "create",
  async (request: NextRequest, user: AuthenticatedUser) => {
    const body = await request.json();

    const finishedProductId = body.finishedProductId as string | undefined;
    const storeId = body.storeId as string | undefined;
    const quantityPlanned = Number(body.quantityPlanned ?? 0);
    const notes = (body.notes as string | undefined) ?? null;

    if (!finishedProductId || !storeId || !Number.isFinite(quantityPlanned) || quantityPlanned <= 0) {
      return NextResponse.json(
        { error: "finishedProductId, storeId and positive quantityPlanned are required" },
        { status: 400 },
      );
    }

    const status: ProductionStatus =
      body.status && Object.values(ProductionStatus).includes(body.status)
        ? body.status
        : ProductionStatus.DRAFT;

    const order = await prisma.productionOrder.create({
      data: {
        finishedProductId,
        storeId,
        quantityPlanned,
        status,
        notes,
        createdById: user.id,
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

    return NextResponse.json(order, { status: 201 });
  },
);

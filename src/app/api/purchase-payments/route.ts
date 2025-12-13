import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PaymentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const statusParam = searchParams.get("status") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const storeId = searchParams.get("storeId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const purchaseId = searchParams.get("purchaseId") || undefined;

    const where: Prisma.PaymentWhereInput = {
      purchaseId: {
        not: null,
      },
    };

    if (statusParam) {
      const status = statusParam as PaymentStatus;
      if (Object.values(PaymentStatus).includes(status)) {
        where.status = status;
      }
    }

    if (purchaseId) {
      where.purchaseId = purchaseId;
    }

    if (startDate || endDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (startDate) {
        createdAtFilter.gte = new Date(startDate);
      }
      if (endDate) {
        createdAtFilter.lte = new Date(endDate);
      }
      where.createdAt = createdAtFilter;
    }

    if (supplierId || storeId) {
      const purchaseFilter: Prisma.PurchaseWhereInput = {};
      if (supplierId) {
        purchaseFilter.supplierId = supplierId;
      }
      if (storeId) {
        purchaseFilter.storeId = storeId;
      }
      where.purchase = purchaseFilter;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          purchase: {
            include: {
              supplier: true,
              store: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching purchase payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

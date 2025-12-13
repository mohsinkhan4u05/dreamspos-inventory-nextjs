import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { InsufficientStockError, applyPurchaseReturn } from "@/lib/stockEngine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const purchaseId = searchParams.get("purchaseId") || undefined
    const storeId = searchParams.get("storeId") || undefined

    const where: Prisma.PurchaseReturnWhereInput = {}
    if (purchaseId) {
      where.purchaseId = purchaseId
    }
    if (storeId) {
      where.purchase = { storeId }
    }

    const [returns, total] = await Promise.all([
      prisma.purchaseReturn.findMany({
        where,
        include: {
          purchase: {
            include: {
              store: {
                select: { id: true, name: true, code: true },
              },
            },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
              variant: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseReturn.count({ where }),
    ])

    return NextResponse.json({
      data: returns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching purchase returns:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { purchaseId, reason, notes, items } = body as {
      purchaseId?: string
      reason?: string | null
      notes?: string | null
      items?: Array<{
        productId: string
        variantId?: string | null
        quantity: number | string
        unitPrice: number | string
        discount?: number
        taxRate?: number
        taxAmount?: number
      }>
    }

    if (!purchaseId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "purchaseId and items are required" },
        { status: 400 },
      )
    }

    const result = await applyPurchaseReturn({
      purchaseId,
      reason: reason ?? null,
      notes: notes ?? null,
      items: (items ?? []).map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: item.discount,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
      })),
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "Insufficient stock for purchase return" },
        { status: 400 },
      )
    }

    console.error("Error creating purchase return:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

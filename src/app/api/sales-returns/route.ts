import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { InsufficientStockError, applySalesReturn } from "@/lib/stockEngine"

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
    const saleId = searchParams.get("saleId") || undefined
    const storeId = searchParams.get("storeId") || undefined

    const where: Prisma.SalesReturnWhereInput = {}
    if (saleId) {
      where.saleId = saleId
    }
    if (storeId) {
      where.sale = { storeId }
    }

    const [returns, total] = await Promise.all([
      prisma.salesReturn.findMany({
        where,
        include: {
          sale: {
            include: {
              store: {
                select: { id: true, name: true, code: true },
              },
              customer: {
                select: { id: true, name: true, email: true },
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
      prisma.salesReturn.count({ where }),
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
    console.error("Error fetching sales returns:", error)
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
    const { saleId, reason, notes, items } = body as {
      saleId?: string
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

    if (!saleId) {
      return NextResponse.json(
        { error: "saleId is required" },
        { status: 400 },
      )
    }

    const result = await applySalesReturn({
      saleId,
      reason: reason ?? null,
      notes: notes ?? null,
      items: items && Array.isArray(items)
        ? items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: item.discount,
            taxRate: item.taxRate,
            taxAmount: item.taxAmount,
          }))
        : undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: "Insufficient stock for sales return" },
        { status: 400 },
      )
    }

    console.error("Error creating sales return:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

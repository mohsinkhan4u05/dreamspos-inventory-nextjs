import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { MovementType, Prisma } from "@prisma/client"

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
    const search = searchParams.get("search") || ""
    const storeId = searchParams.get("storeId") || undefined

    const where: Prisma.StockMovementWhereInput = {
      movementType: {
        in: [MovementType.ADJUSTMENT_IN, MovementType.ADJUSTMENT_OUT],
      },
    }

    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      }
    }

    if (storeId) {
      where.storeId = storeId
    }

    const [adjustments, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              code: true,
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ])

    return NextResponse.json({
      data: adjustments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching stock adjustments:", error)
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
    const {
      productId,
      variantId,
      storeId,
      unitId,
      stockId,
      quantity,
      movementType,
      reference,
      description,
    } = body

    if (!productId || !storeId || quantity === undefined || !movementType) {
      return NextResponse.json(
        { error: "productId, storeId, quantity and movementType are required" },
        { status: 400 },
      )
    }

    if (!Object.values(MovementType).includes(movementType)) {
      return NextResponse.json(
        { error: "Invalid movementType" },
        { status: 400 },
      )
    }

    if (
      movementType !== MovementType.ADJUSTMENT_IN &&
      movementType !== MovementType.ADJUSTMENT_OUT
    ) {
      return NextResponse.json(
        { error: "movementType must be ADJUSTMENT_IN or ADJUSTMENT_OUT" },
        { status: 400 },
      )
    }

    const parsedQuantity = Number(quantity)
    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 },
      )
    }

    try {
      const adjustment = await prisma.$transaction(async (tx) => {
        // Locate or create the related Stock row
        let stock = null as Awaited<ReturnType<typeof tx.stock.findUnique>> | null

        if (stockId) {
          stock = await tx.stock.findUnique({ where: { id: stockId } })
        }

        if (!stock) {
          stock = await tx.stock.findFirst({
            where: {
              productId,
              variantId: variantId || null,
              storeId,
            },
          })
        }

        if (!stock) {
          // Create a new stock record if none exists yet for this product/store
          stock = await tx.stock.create({
            data: {
              productId,
              variantId: variantId || null,
              storeId,
              warehouseId: null,
              unitId: unitId || null,
              quantity: 0,
              minStock: 0,
              maxStock: null,
            },
          })
        }

        const delta =
          movementType === MovementType.ADJUSTMENT_IN
            ? parsedQuantity
            : -parsedQuantity

        const newQuantity = stock.quantity + delta
        if (newQuantity < 0) {
          throw new Error("INSUFFICIENT_STOCK")
        }

        await tx.stock.update({
          where: { id: stock.id },
          data: { quantity: newQuantity },
        })

        const created = await tx.stockMovement.create({
          data: {
            productId,
            variantId: variantId || null,
            storeId,
            unitId: unitId || null,
            stockId: stock.id,
            movementType,
            quantity: parsedQuantity,
            reference: reference || null,
            description: description || null,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                code: true,
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
        })

        return created
      })

      return NextResponse.json(adjustment, { status: 201 })
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          { error: "Insufficient stock for adjustment" },
          { status: 400 },
        )
      }

      console.error("Error creating stock adjustment:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error creating stock adjustment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

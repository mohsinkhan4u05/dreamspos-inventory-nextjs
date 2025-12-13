import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { MovementType, Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const movement = await prisma.stockMovement.findUnique({
      where: { id },
      include: {
        product: {
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
        store: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    if (!movement) {
      return NextResponse.json({ error: "Stock adjustment not found" }, { status: 404 })
    }

    let stockAdjustment:
      | Prisma.StockAdjustmentGetPayload<{ include: { user: true } }>
      | null = null

    if (movement.sourceId) {
      stockAdjustment = await prisma.stockAdjustment.findUnique({
        where: { id: movement.sourceId },
        include: {
          user: true,
        },
      })
    }

    const movementItems = stockAdjustment
      ? await prisma.stockMovement.findMany({
          where: { sourceId: stockAdjustment.id },
          include: {
            product: {
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
          orderBy: { createdAt: "asc" },
        })
      : [movement]

    const items = movementItems.map((m) => ({
      itemId: m.productId,
      name: m.product?.name || "Unknown Item",
      description: m.description || undefined,
      quantityAdjusted:
        m.movementType === MovementType.ADJUSTMENT_OUT ? -m.quantity : m.quantity,
      costPrice: m.unitCost ?? 0,
      unit: m.unit?.code || undefined,
    }))

    const createdByName = stockAdjustment?.user
      ? [stockAdjustment.user.firstName, stockAdjustment.user.lastName]
          .filter(Boolean)
          .join(" ") ||
        stockAdjustment.user.username ||
        stockAdjustment.user.email ||
        "System"
      : "System"

    const details = {
      id: stockAdjustment?.id ?? movement.id,
      date: (stockAdjustment?.adjustmentDate ?? movement.createdAt).toISOString(),
      reason: stockAdjustment?.reason ?? movement.description ?? "",
      account: stockAdjustment?.account ?? null,
      adjustmentType:
        stockAdjustment?.adjustmentType === "VALUE" ? "Value" : ("Quantity" as const),
      createdBy: createdByName,
      items,
    }

    return NextResponse.json(details)
  } catch (error) {
    console.error("Error fetching stock adjustment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const body = await request.json()
    const { quantity, movementType, reference, description } = body as {
      quantity?: unknown
      movementType?: MovementType
      reference?: string | null
      description?: string | null
    }

    // We only allow updating reference and description; quantity and movementType
    // are immutable for audit and stock consistency.
    if (quantity !== undefined || movementType !== undefined) {
      return NextResponse.json(
        { error: "Quantity and movementType cannot be modified once created" },
        { status: 400 },
      )
    }

    if (reference === undefined && description === undefined) {
      return NextResponse.json(
        { error: "No updatable fields provided (only reference and description are allowed)" },
        { status: 400 },
      )
    }

    const data: Prisma.StockMovementUpdateInput = {}

    if (reference !== undefined) {
      data.reference = reference || null
    }

    if (description !== undefined) {
      data.description = description || null
    }

    const adjustment = await prisma.stockMovement.update({
      where: { id },
      data,
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

    return NextResponse.json(adjustment)
  } catch (error) {
    console.error("Error updating stock adjustment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    await prisma.stockMovement.delete({ where: { id } })

    return NextResponse.json({ message: "Stock adjustment deleted successfully" })
  } catch (error) {
    console.error("Error deleting stock adjustment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

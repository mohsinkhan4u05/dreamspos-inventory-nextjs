import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { MovementType, Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adjustment = await prisma.stockMovement.findUnique({
      where: { id: params.id },
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

    if (!adjustment) {
      return NextResponse.json({ error: "Stock adjustment not found" }, { status: 404 })
    }

    return NextResponse.json(adjustment)
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
  { params }: { params: { id: string } },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      where: { id: params.id },
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
  { params }: { params: { id: string } },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.stockMovement.delete({ where: { id: params.id } })

    return NextResponse.json({ message: "Stock adjustment deleted successfully" })
  } catch (error) {
    console.error("Error deleting stock adjustment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

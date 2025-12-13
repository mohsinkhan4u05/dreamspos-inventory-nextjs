import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

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

    const stock = await prisma.stock.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            sellingPrice: true,
            // category: {
            //   select: { id: true, name: true },
            // },
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
        warehouse: {
          select: {
            id: true,
            name: true,
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

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 })
    }

    return NextResponse.json(stock)
  } catch (error) {
    console.error("Error fetching stock:", error)
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

    const body = await request.json()
    const { quantity, minStock, maxStock, batchNumber, expiryDate } = body

    if (
      quantity === undefined &&
      minStock === undefined &&
      maxStock === undefined &&
      batchNumber === undefined &&
      expiryDate === undefined
    ) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 },
      )
    }

    const updateData: Record<string, unknown> = {}

    if (quantity !== undefined) {
      const parsed = Number(quantity)
      if (Number.isNaN(parsed)) {
        return NextResponse.json(
          { error: "Quantity must be a valid number" },
          { status: 400 },
        )
      }
      updateData.quantity = parsed
    }

    if (minStock !== undefined) {
      const parsed = Number(minStock)
      if (Number.isNaN(parsed)) {
        return NextResponse.json(
          { error: "minStock must be a valid number" },
          { status: 400 },
        )
      }
      updateData.minStock = parsed
    }

    if (maxStock !== undefined) {
      const parsed = Number(maxStock)
      if (Number.isNaN(parsed)) {
        return NextResponse.json(
          { error: "maxStock must be a valid number" },
          { status: 400 },
        )
      }
      updateData.maxStock = parsed
    }

    if (batchNumber !== undefined) {
      updateData.batchNumber = batchNumber || null
    }

    if (expiryDate !== undefined) {
      updateData.expiryDate = expiryDate ? new Date(expiryDate) : null
    }

    const { id } = await context.params

    const stock = await prisma.stock.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            sellingPrice: true,
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
        warehouse: {
          select: {
            id: true,
            name: true,
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

    return NextResponse.json(stock)
  } catch (error) {
    console.error("Error updating stock:", error)
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

    await prisma.stock.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Stock deleted successfully" })
  } catch (error) {
    console.error("Error deleting stock:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

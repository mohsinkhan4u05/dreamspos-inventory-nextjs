import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { adjustOpeningStock, InsufficientStockError } from "@/lib/stockEngine"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params

    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { openingStock, openingStockRate } = body as {
      openingStock?: unknown
      openingStockRate?: unknown
    }

    const parsedOpeningStock =
      openingStock === null || openingStock === undefined
        ? null
        : Number(openingStock)

    const parsedOpeningStockRate =
      openingStockRate === null || openingStockRate === undefined
        ? null
        : Number(openingStockRate)

    if (
      (parsedOpeningStock !== null && Number.isNaN(parsedOpeningStock)) ||
      (parsedOpeningStockRate !== null && Number.isNaN(parsedOpeningStockRate))
    ) {
      return NextResponse.json(
        { error: "openingStock and openingStockRate must be numbers" },
        { status: 400 },
      )
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, openingStock: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    const previousOpeningStock = product.openingStock ?? 0
    const nextOpeningStock = parsedOpeningStock ?? 0

    try {
      await adjustOpeningStock({
        productId: product.id,
        newOpeningStock: nextOpeningStock,
        previousOpeningStock,
      })
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return NextResponse.json(
          { error: "Insufficient stock for opening stock adjustment" },
          { status: 400 },
        )
      }
      throw err
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        openingStock: parsedOpeningStock,
        openingStockRate: parsedOpeningStockRate,
      },
      select: {
        id: true,
        openingStock: true,
        openingStockRate: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update opening stock error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

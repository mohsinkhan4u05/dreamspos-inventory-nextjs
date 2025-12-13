import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { getItemStockSummary } from "@/lib/stockMetrics"

export const dynamic = "force-dynamic"

async function buildStockSummary(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      openingStock: true,
      openingStockRate: true,
    },
  })

  if (!product) {
    return null
  }

  // Aggregate metrics across all stores / variants for this product
  const metrics = await getItemStockSummary({ productId })

  const stockOnHand = metrics.accountingStock
  const committedStock = metrics.committedStock
  const availableForSale = metrics.physicalStock

  return {
    productId: product.id,
    openingStock: product.openingStock ?? null,
    openingStockRate: product.openingStockRate ?? null,
    stockOnHand,
    committedStock,
    availableForSale,
    physicalStock: {
      toBeShipped: metrics.toBeShipped,
      toBeReceived: metrics.toBeReceived,
      toBeInvoiced: metrics.toBeInvoiced,
      toBeBilled: metrics.toBeBilled,
    },
  }
}

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const summary = await buildStockSummary(id)

    if (!summary) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error("Item stock summary error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

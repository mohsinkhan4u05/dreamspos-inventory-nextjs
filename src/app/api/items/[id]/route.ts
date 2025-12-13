import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const item = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        unit: true,
        preferredVendor: true,
        variants: {
          include: {
            stocks: true,
          },
        },
        units: {
          include: {
            unit: true,
          },
        },
        stocks: {
          include: {
            store: true,
            warehouse: true,
            unit: true,
          },
        },
        gstRates: {
          include: {
            gstRate: true,
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("Item detail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

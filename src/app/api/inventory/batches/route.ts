import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { BatchStatus } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")
    const productId = searchParams.get("productId")

    if (!storeId || !productId) {
      return NextResponse.json(
        { error: "storeId and productId are required" },
        { status: 400 },
      )
    }

    const today = new Date()

    const batches = await prisma.itemBatch.findMany({
      where: {
        productId,
        status: BatchStatus.ACTIVE,
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: today } },
        ],
        availableQuantity: {
          gt: 0,
        },
      },
      orderBy: [
        { manufacturingDate: "asc" },
        { createdAt: "asc" },
      ],
    })

    return NextResponse.json({ data: batches })
  } catch (error) {
    console.error("Error fetching batches:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

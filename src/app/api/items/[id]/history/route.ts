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
    const { id: productId } = await context.params

    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adjustments = await prisma.stockAdjustment.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    const history = adjustments.map((adj) => {
      const userName =
        (adj.user.firstName || adj.user.lastName)
          ? `${adj.user.firstName ?? ""} ${adj.user.lastName ?? ""}`.trim()
          : adj.user.username

      return {
        id: adj.id,
        type: "STOCK_ADJUSTMENT" as const,
        adjustmentType: adj.adjustmentType,
        quantityAdjusted: adj.quantityAdjusted,
        oldQuantity: adj.oldQuantity,
        newQuantity: adj.newQuantity,
        reason: adj.reason,
        notes: adj.notes,
        referenceNumber: adj.referenceNumber,
        account: adj.account,
        status: adj.status,
        adjustmentDate: adj.adjustmentDate,
        createdAt: adj.createdAt,
        user: {
          id: adj.user.id,
          name: userName,
        },
        store: adj.store,
        message: `updated. Stock changed from ${adj.oldQuantity} to ${adj.newQuantity} – ${userName}`,
      }
    })

    return NextResponse.json({ data: history })
  } catch (error) {
    console.error("Item history error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

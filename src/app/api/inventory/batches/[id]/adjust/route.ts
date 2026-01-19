import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { MovementSourceType, MovementType } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const storeId = (token as any).storeId as string | undefined

    if (!storeId) {
      return NextResponse.json(
        { error: "Active store is required for stock adjustment" },
        { status: 400 }
      )
    }

    const { id: batchId } = await context.params

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body.quantityDelta !== "number") {
      return NextResponse.json(
        { error: "quantityDelta (number) is required" },
        { status: 400 }
      )
    }

    const quantityDelta = body.quantityDelta as number
    const reason: string | null = body.reason ?? null

    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      return NextResponse.json(
        { error: "quantityDelta must be a non-zero number" },
        { status: 400 }
      )
    }

    const batch = await prisma.itemBatch.findUnique({
      where: { id: batchId },
    })

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    const newAvailable = batch.availableQuantity + quantityDelta

    if (newAvailable < 0) {
      return NextResponse.json(
        { error: "Insufficient available quantity for this batch" },
        { status: 400 }
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.itemBatch.update({
        where: { id: batchId },
        data: { availableQuantity: newAvailable },
      })

      const movementType =
        quantityDelta > 0
          ? MovementType.ADJUSTMENT_IN
          : MovementType.ADJUSTMENT_OUT

      const movementQuantity = Math.abs(quantityDelta)

      const movement = await tx.stockMovement.create({
        data: {
          productId: batch.productId,
          batchId: batch.id,
          storeId,
          movementType,
          quantity: movementQuantity,
          unitCost: batch.unitCost,
          totalCost: batch.unitCost * movementQuantity,
          description: reason,
          sourceType: MovementSourceType.ADJUSTMENT,
        },
      })

      return { updatedBatch, movement }
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("Error adjusting batch:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

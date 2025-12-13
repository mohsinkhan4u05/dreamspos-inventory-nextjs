import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { applyItemStockAdjustment, InsufficientStockError } from "@/lib/stockEngine"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

const ADJUSTMENT_TYPES = ["QUANTITY", "VALUE"] as const
const ADJUSTMENT_STATUSES = ["DRAFT", "FINAL"] as const

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: productId } = await context.params

    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      storeId,
      adjustmentType,
      quantityAdjusted,
      costPerUnit,
      reason,
      referenceNumber,
      account,
      notes,
      status,
      adjustmentDate,
    } = body as {
      storeId?: unknown
      adjustmentType?: unknown
      quantityAdjusted?: unknown
      costPerUnit?: unknown
      reason?: unknown
      referenceNumber?: unknown
      account?: unknown
      notes?: unknown
      status?: unknown
      adjustmentDate?: unknown
    }

    const rawStoreId = typeof storeId === "string" && storeId.trim() !== "" ? storeId : undefined

    let effectiveStoreId = rawStoreId

    if (!effectiveStoreId) {
      let defaultStore = await prisma.store.findFirst()

      if (!defaultStore) {
        defaultStore = await prisma.store.create({
          data: {
            name: "Default Store",
            code: "DEFAULT",
          },
        })
      }

      effectiveStoreId = defaultStore.id
    }

    if (
      typeof adjustmentType !== "string" ||
      !ADJUSTMENT_TYPES.includes(adjustmentType as (typeof ADJUSTMENT_TYPES)[number])
    ) {
      return NextResponse.json({ error: "Invalid adjustmentType" }, { status: 400 })
    }

    if (
      typeof status !== "string" ||
      !ADJUSTMENT_STATUSES.includes(status as (typeof ADJUSTMENT_STATUSES)[number])
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const parsedQuantity = Number(quantityAdjusted)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
      return NextResponse.json(
        { error: "quantityAdjusted must be a non-zero number" },
        { status: 400 },
      )
    }

    let parsedCostPerUnit: number | null = null
    if (costPerUnit !== null && costPerUnit !== undefined && costPerUnit !== "") {
      const n = Number(costPerUnit)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { error: "costPerUnit must be a non-negative number" },
          { status: 400 },
        )
      }
      parsedCostPerUnit = n
    }

    if (
      adjustmentType === "QUANTITY" &&
      status === "FINAL" &&
      parsedQuantity > 0 &&
      parsedCostPerUnit === null
    ) {
      return NextResponse.json(
        { error: "costPerUnit is required when increasing quantity in FINAL adjustments" },
        { status: 400 },
      )
    }

    const authUserId = token.sub as string | undefined
    if (!authUserId) {
      return NextResponse.json({ error: "Invalid user context" }, { status: 400 })
    }

    // Ensure we use a valid User.id for the createdBy foreign key on StockAdjustment
    let effectiveUserId: string | null = null

    const existingAuthUser = await prisma.user.findUnique({ where: { id: authUserId } })
    if (existingAuthUser) {
      effectiveUserId = existingAuthUser.id
    } else {
      const fallbackUser = await prisma.user.findFirst()
      if (fallbackUser) {
        effectiveUserId = fallbackUser.id
      } else {
        const systemUser = await prisma.user.create({
          data: {
            email: "system@example.com",
            username: "system",
            password: "", // system user used only as a technical owner
          },
        })
        effectiveUserId = systemUser.id
      }
    }

    try {
      const result = await applyItemStockAdjustment({
        productId,
        storeId: effectiveStoreId!,
        userId: effectiveUserId!,
        adjustmentType: adjustmentType as "QUANTITY" | "VALUE",
        quantityAdjusted: parsedQuantity,
        costPerUnit: parsedCostPerUnit,
        reason: typeof reason === "string" ? reason : null,
        referenceNumber: typeof referenceNumber === "string" ? referenceNumber : null,
        account: typeof account === "string" ? account : null,
        notes: typeof notes === "string" ? notes : null,
        status: status as "DRAFT" | "FINAL",
        adjustmentDate: typeof adjustmentDate === "string" ? adjustmentDate : null,
      })

      return NextResponse.json(result, { status: 201 })
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return NextResponse.json(
          { error: "Insufficient stock for adjustment" },
          { status: 400 },
        )
      }
      console.error("Item adjust stock error:", err)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  } catch (error) {
    console.error("Item adjust stock error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

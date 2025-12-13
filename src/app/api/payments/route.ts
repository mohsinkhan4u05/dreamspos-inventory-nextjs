import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const status = searchParams.get("status") || undefined
    const customerId = searchParams.get("customerId") || undefined
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined

    const where: any = {
      // Only payments that are receipts against sales (received payments)
      saleId: {
        not: null,
      },
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    if (customerId) {
      where.sale = {
        customerId,
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          sale: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ])

    return NextResponse.json({
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

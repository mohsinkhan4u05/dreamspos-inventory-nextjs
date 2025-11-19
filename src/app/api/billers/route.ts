import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const isActive = searchParams.get("isActive")

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ]
    }

    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const [billers, total] = await Promise.all([
      prisma.biller.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.biller.count({ where }),
    ])

    return NextResponse.json({
      data: billers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching billers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, company, email, phone, address, country, state, city, postalCode, isActive } = body

    if (!name) {
      return NextResponse.json(
        { error: "Biller name is required" },
        { status: 400 },
      )
    }

    const biller = await prisma.biller.create({
      data: {
        name,
        company: company || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        country: country || null,
        state: state || null,
        city: city || null,
        postalCode: postalCode || null,
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    })

    return NextResponse.json(biller, { status: 201 })
  } catch (error) {
    console.error("Error creating biller:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

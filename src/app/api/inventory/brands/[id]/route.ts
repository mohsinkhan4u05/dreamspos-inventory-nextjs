import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    return NextResponse.json(brand)
  } catch (error) {
    console.error("Error fetching brand:", error)
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
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id } = await context.params
    const { name, description, image, isActive } = body

    if (!name) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 },
      )
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name,
        description: description ?? null,
        image: image ?? null,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error("Error updating brand:", error)
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
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    await prisma.brand.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Brand deleted successfully" })
  } catch (error) {
    console.error("Error deleting brand:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

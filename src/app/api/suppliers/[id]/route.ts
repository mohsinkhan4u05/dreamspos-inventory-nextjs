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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        addresses: true,
        contactPersons: true,
        activityLogs: true,
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Error fetching supplier:", error)
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
    const { name, email, phone, address, gstNumber, isActive } = body

    if (!name) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 },
      )
    }

    const { id } = await context.params

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        gstNumber: gstNumber ?? null,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error("Error updating supplier:", error)
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

    await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Supplier deleted successfully" })
  } catch (error) {
    console.error("Error deleting supplier:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

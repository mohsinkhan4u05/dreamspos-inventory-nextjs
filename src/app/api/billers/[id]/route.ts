import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const biller = await prisma.biller.findUnique({
      where: { id: params.id },
    })

    if (!biller) {
      return NextResponse.json({ error: "Biller not found" }, { status: 404 })
    }

    return NextResponse.json(biller)
  } catch (error) {
    console.error("Error fetching biller:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const biller = await prisma.biller.update({
      where: { id: params.id },
      data: {
        name,
        company: company ?? null,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        country: country ?? null,
        state: state ?? null,
        city: city ?? null,
        postalCode: postalCode ?? null,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    })

    return NextResponse.json(biller)
  } catch (error) {
    console.error("Error updating biller:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.biller.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Biller deleted successfully" })
  } catch (error) {
    console.error("Error deleting biller:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

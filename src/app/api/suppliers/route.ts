import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

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
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { gstNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ])

    return NextResponse.json({
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const rawDisplayName =
      typeof body.displayName === "string" && body.displayName.trim().length > 0
        ? body.displayName.trim()
        : typeof body.name === "string"
          ? body.name.trim()
          : ""

    if (!rawDisplayName) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 },
      )
    }

    const isActive = typeof body.isActive === "boolean" ? body.isActive : true

    const addresses = Array.isArray(body.addresses)
      ? body.addresses
          .filter((addr: any) => addr && typeof addr === "object")
          .map((addr: any) => ({
            type: typeof addr.type === "string" && addr.type.trim().length > 0 ? addr.type.trim() : "",
            attention: addr.attention ?? null,
            address1: addr.address1 ?? null,
            address2: addr.address2 ?? null,
            city: addr.city ?? null,
            state: addr.state ?? null,
            zipcode: addr.zipcode ?? null,
            country: addr.country ?? null,
            phone: addr.phone ?? null,
          }))
          .filter((addr: { type: string }) => addr.type.length > 0)
      : []

    const contactPersons = Array.isArray(body.contactPersons)
      ? body.contactPersons
          .filter((cp: any) => cp && typeof cp.firstName === "string" && cp.firstName.trim().length > 0)
          .map((cp: any, index: number) => ({
            salutation: cp.salutation ?? null,
            firstName: cp.firstName.trim(),
            lastName: cp.lastName ?? null,
            email: cp.email ?? null,
            workPhone: cp.workPhone ?? null,
            mobile: cp.mobile ?? null,
            isPrimary: typeof cp.isPrimary === "boolean" ? cp.isPrimary : index === 0,
          }))
      : []

    const supplier = await prisma.supplier.create({
      data: {
        name: rawDisplayName,
        email: body.email ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        gstNumber: body.gstNumber ?? null,
        isActive,

        type:
          body.type === "BUSINESS" || body.type === "INDIVIDUAL"
            ? body.type
            : null,
        salutation: body.salutation ?? null,
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        displayName: body.displayName ?? rawDisplayName,
        companyName: body.companyName ?? null,
        mobile: body.mobile ?? null,
        language: body.language ?? null,
        pan: body.pan ?? null,
        currency: body.currency ?? null,
        paymentTerms: body.paymentTerms ?? null,
        remarks: body.remarks ?? null,

        ...(addresses.length
          ? {
              addresses: {
                create: addresses,
              },
            }
          : {}),

        ...(contactPersons.length
          ? {
              contactPersons: {
                create: contactPersons,
              },
            }
          : {}),
      },
      include: {
        addresses: true,
        contactPersons: true,
      },
    })

    try {
      await prisma.supplierActivityLog.create({
        data: {
          supplierId: supplier.id,
          type: "SUPPLIER_CREATED",
          title: "Supplier created",
          description: `Supplier ${supplier.displayName || supplier.name} was created`,
          entityType: "SUPPLIER",
          entityId: supplier.id,
        },
      })
    } catch (logError) {
      console.error("Failed to write supplier activity log:", logError)
    }

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Error creating supplier:", error)

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A supplier with this email already exists" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        contactPersons: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error fetching customer:", error)
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

    const rawDisplayName =
      typeof body.displayName === "string" && body.displayName.trim().length > 0
        ? body.displayName.trim()
        : typeof body.name === "string"
          ? body.name.trim()
          : ""

    if (!rawDisplayName) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 },
      )
    }

    const data: Record<string, unknown> = {
      name: rawDisplayName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      gstNumber: body.gstNumber ?? null,
      ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
    }

    // Extended profile fields - only override when provided
    if ("type" in body) {
      data.type =
        body.type === "BUSINESS" || body.type === "INDIVIDUAL"
          ? body.type
          : null
    }

    if ("salutation" in body) {
      data.salutation = body.salutation ?? null
    }
    if ("firstName" in body) {
      data.firstName = body.firstName ?? null
    }
    if ("lastName" in body) {
      data.lastName = body.lastName ?? null
    }
    if ("displayName" in body || "name" in body) {
      data.displayName = body.displayName ?? rawDisplayName
    }
    if ("companyName" in body) {
      data.companyName = body.companyName ?? null
    }
    if ("mobile" in body) {
      data.mobile = body.mobile ?? null
    }
    if ("language" in body) {
      data.language = body.language ?? null
    }
    if ("pan" in body) {
      data.pan = body.pan ?? null
    }
    if ("currency" in body) {
      data.currency = body.currency ?? null
    }
    if ("paymentTerms" in body) {
      data.paymentTerms = body.paymentTerms ?? null
    }
    if ("allowPortal" in body) {
      data.allowPortal =
        typeof body.allowPortal === "boolean" ? body.allowPortal : false
    }
    if ("remarks" in body) {
      data.remarks = body.remarks ?? null
    }

    // Addresses: if an addresses array is provided, replace existing addresses
    if (Array.isArray(body.addresses)) {
      const addresses = body.addresses
        .filter((addr: any) => addr && typeof addr === "object")
        .map((addr: any) => ({
          type: typeof addr.type === "string" && addr.type.trim() ? addr.type.trim() : "",
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

      ;(data as any).addresses = {
        deleteMany: {},
        ...(addresses.length ? { create: addresses } : {}),
      }
    }

    // Contact persons: if contactPersons array is provided, replace existing contact persons
    if (Array.isArray(body.contactPersons)) {
      const contactPersons = body.contactPersons
        .filter(
          (cp: any) => cp && typeof cp.firstName === "string" && cp.firstName.trim().length > 0,
        )
        .map((cp: any, index: number) => ({
          salutation: cp.salutation ?? null,
          firstName: cp.firstName.trim(),
          lastName: cp.lastName ?? null,
          email: cp.email ?? null,
          workPhone: cp.workPhone ?? null,
          mobile: cp.mobile ?? null,
          isPrimary: typeof cp.isPrimary === "boolean" ? cp.isPrimary : index === 0,
        }))

      ;(data as any).contactPersons = {
        deleteMany: {},
        ...(contactPersons.length ? { create: contactPersons } : {}),
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data,
      include: {
        addresses: true,
        contactPersons: true,
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error updating customer:", error)
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

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: "Customer deleted successfully" })
  } catch (error) {
    console.error("Error deleting customer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

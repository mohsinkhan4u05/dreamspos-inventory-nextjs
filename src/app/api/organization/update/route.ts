import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = token.role as string | undefined;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.organizationProfile.findFirst();

    if (!existing) {
      return NextResponse.json({ error: "Organization profile not found" }, { status: 404 });
    }

    const body = await request.json();

    if (body.primaryContactEmail && !isValidEmail(body.primaryContactEmail)) {
      return NextResponse.json({ error: "Invalid primaryContactEmail" }, { status: 400 });
    }

    const organization = await prisma.organizationProfile.update({
      where: { id: existing.id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        industry: body.industry ?? undefined,
        location: body.location !== undefined ? String(body.location).trim() : undefined,
        addressLine1: body.addressLine1 !== undefined ? String(body.addressLine1).trim() : undefined,
        addressLine2: body.addressLine2 ?? undefined,
        city: body.city !== undefined ? String(body.city).trim() : undefined,
        state: body.state !== undefined ? String(body.state).trim() : undefined,
        zipCode: body.zipCode !== undefined ? String(body.zipCode).trim() : undefined,
        websiteUrl: body.websiteUrl ?? undefined,

        primaryContactName: body.primaryContactName !== undefined ? String(body.primaryContactName).trim() : undefined,
        primaryContactEmail: body.primaryContactEmail !== undefined ? String(body.primaryContactEmail).trim() : undefined,
        primaryContactPhone: body.primaryContactPhone ?? undefined,

        baseCurrency: body.baseCurrency !== undefined ? String(body.baseCurrency).trim() : undefined,
        fiscalYear: body.fiscalYear !== undefined ? String(body.fiscalYear).trim() : undefined,
        language: body.language !== undefined ? String(body.language).trim() : undefined,
        communicationLang: body.communicationLang !== undefined ? String(body.communicationLang).trim() : undefined,
        timezone: body.timezone !== undefined ? String(body.timezone).trim() : undefined,
        dateFormat: body.dateFormat !== undefined ? String(body.dateFormat).trim() : undefined,
        companyId: body.companyId ?? undefined,

        logoUrl: body.logoUrl ?? undefined,

        customFields: body.customFields ?? undefined,
      },
    });

    return NextResponse.json({ data: organization });
  } catch (error) {
    console.error("Error updating organization profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

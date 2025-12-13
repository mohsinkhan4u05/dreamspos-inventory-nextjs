import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = token.role as string | undefined;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingCount = await prisma.organizationProfile.count();
    if (existingCount > 0) {
      return NextResponse.json({
        error: "Organization already exists. Please use the update endpoint.",
      }, { status: 400 });
    }

    const body = await request.json();

    const requiredFields: Array<keyof typeof body> = [
      "name",
      "location",
      "addressLine1",
      "city",
      "state",
      "zipCode",
      "primaryContactName",
      "primaryContactEmail",
      "baseCurrency",
      "fiscalYear",
      "language",
      "communicationLang",
      "timezone",
      "dateFormat",
    ];

    const missing = requiredFields.filter((field) => !body[field] || String(body[field]).trim().length === 0);

    if (missing.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missing.join(", ")}`,
      }, { status: 400 });
    }

    if (!isValidEmail(body.primaryContactEmail)) {
      return NextResponse.json({ error: "Invalid primaryContactEmail" }, { status: 400 });
    }

    const organization = await prisma.organizationProfile.create({
      data: {
        name: String(body.name).trim(),
        industry: body.industry ?? null,
        location: String(body.location).trim(),
        addressLine1: String(body.addressLine1).trim(),
        addressLine2: body.addressLine2 ?? null,
        city: String(body.city).trim(),
        state: String(body.state).trim(),
        zipCode: String(body.zipCode).trim(),
        websiteUrl: body.websiteUrl ?? null,

        primaryContactName: String(body.primaryContactName).trim(),
        primaryContactEmail: String(body.primaryContactEmail).trim(),
        primaryContactPhone: body.primaryContactPhone ?? null,

        baseCurrency: String(body.baseCurrency).trim(),
        fiscalYear: String(body.fiscalYear).trim(),
        language: String(body.language).trim(),
        communicationLang: String(body.communicationLang).trim(),
        timezone: String(body.timezone).trim(),
        dateFormat: String(body.dateFormat).trim(),
        companyId: body.companyId ?? null,

        logoUrl: body.logoUrl ?? null,

        customFields: body.customFields ?? null,
      },
    });

    return NextResponse.json({ data: organization }, { status: 201 });
  } catch (error) {
    console.error("Error creating organization profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

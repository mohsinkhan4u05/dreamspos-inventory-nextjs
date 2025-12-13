import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    const body = await request.json();
    const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : "";

    if (!logoUrl) {
      return NextResponse.json({ error: "logoUrl is required" }, { status: 400 });
    }

    const existing = await prisma.organizationProfile.findFirst();

    if (!existing) {
      return NextResponse.json({ error: "Organization profile not found" }, { status: 404 });
    }

    const organization = await prisma.organizationProfile.update({
      where: { id: existing.id },
      data: { logoUrl },
    });

    return NextResponse.json({ data: organization });
  } catch (error) {
    console.error("Error updating organization logo:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

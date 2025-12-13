import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await prisma.organizationProfile.findFirst();

    return NextResponse.json({ data: organization ?? null });
  } catch (error) {
    console.error("Error fetching organization profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

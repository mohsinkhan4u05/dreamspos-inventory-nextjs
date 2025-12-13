import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const store = await prisma.store.findUnique({
      where: { id },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, address, phone, email, isActive } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Store name and code are required" },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    const store = await prisma.store.update({
      where: { id },
      data: {
        name,
        code,
        address: address ?? null,
        phone: phone ?? null,
        email: email ?? null,
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await prisma.store.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Store deleted successfully" });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        salesOrder: {
          include: {
            customer: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        store: true,
        items: {
          include: {
            salesOrderItem: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
                variant: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
        shipments: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(pkg);
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

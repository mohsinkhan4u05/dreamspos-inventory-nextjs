import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const receive = await prisma.purchaseReceive.findUnique({
      where: { id },
      include: {
        supplier: {
          select: { id: true, name: true, email: true, phone: true },
        },
        store: {
          select: { id: true, name: true, code: true },
        },
        purchaseOrder: {
          include: {
            supplier: {
              select: { id: true, name: true, email: true, phone: true },
            },
            store: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            purchaseOrderItem: {
              select: {
                id: true,
                quantity: true,
                receivedQuantity: true,
                billedQuantity: true,
              },
            },
          },
        },
      },
    });

    if (!receive) {
      return NextResponse.json(
        { error: "Purchase receive not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(receive);
  } catch (error) {
    console.error("Error fetching purchase receive:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

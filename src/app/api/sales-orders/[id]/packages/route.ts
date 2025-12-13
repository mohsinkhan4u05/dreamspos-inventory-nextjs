import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { PackageStatus, SalesOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(num) ? num : fallback;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await context.params;

    const packages = await prisma.package.findMany({
      where: { salesOrderId: orderId },
      orderBy: { packageDate: "asc" },
      include: {
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
          select: {
            id: true,
            shipmentNumber: true,
            shipmentDate: true,
            status: true,
            delivered: true,
          },
        },
      },
    });

    return NextResponse.json({ data: packages });
  } catch (error) {
    console.error("Error fetching packages for sales order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface PackageItemInput {
  salesOrderItemId: string;
  quantity: unknown;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await context.params;
    const rawBody = await request.json();

    const packageDate = rawBody.packageDate ? new Date(rawBody.packageDate) : new Date();
    const notes = (rawBody.notes as string | undefined) ?? null;
    const itemsInput = Array.isArray(rawBody.items) ? (rawBody.items as PackageItemInput[]) : [];

    if (itemsInput.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required to create a package" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
      }

      if (
        order.status === SalesOrderStatus.CANCELLED ||
        order.status === SalesOrderStatus.CLOSED
      ) {
        return NextResponse.json(
          { error: "Closed or cancelled sales orders cannot be packaged" },
          { status: 400 },
        );
      }

      const mappedItems = [] as {
        salesOrderItemId: string;
        productId: string;
        variantId: string | null;
        quantity: number;
      }[];

      for (const input of itemsInput) {
        const soItem = order.items.find((i) => i.id === input.salesOrderItemId);
        if (!soItem) {
          return NextResponse.json(
            { error: `Invalid sales order item: ${input.salesOrderItemId}` },
            { status: 400 },
          );
        }

        const quantity = normalizeNumber(input.quantity, 0);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return NextResponse.json(
            { error: "Quantity to pack must be greater than zero" },
            { status: 400 },
          );
        }

        const remainingToPack = soItem.quantity - soItem.packedQuantity;
        if (quantity > remainingToPack + 1e-6) {
          return NextResponse.json(
            { error: `Quantity to pack exceeds remaining quantity for item ${soItem.id}` },
            { status: 400 },
          );
        }

        // Basic stock availability check at store level
        const stockRow = await tx.stock.findFirst({
          where: {
            productId: soItem.productId,
            variantId: soItem.variantId,
            storeId: order.storeId,
          },
        });

        const stockOnHand = stockRow?.quantity ?? 0;
        if (stockOnHand < quantity - 1e-6) {
          return NextResponse.json(
            {
              error: `Insufficient stock on hand for item ${soItem.id}. On hand: ${stockOnHand}, requested: ${quantity}`,
            },
            { status: 409 },
          );
        }

        mappedItems.push({
          salesOrderItemId: soItem.id,
          productId: soItem.productId,
          variantId: soItem.variantId,
          quantity,
        });
      }

      const existingCount = await tx.package.count({ where: { storeId: order.storeId } });
      const packageNumber = `PKG-${String(existingCount + 1).padStart(5, "0")}`;

      const created = await tx.package.create({
        data: {
          packageNumber,
          salesOrderId: order.id,
          storeId: order.storeId,
          status: PackageStatus.NOT_SHIPPED,
          packageDate,
          notes,
          items: {
            create: mappedItems.map((item) => ({
              salesOrderItemId: item.salesOrderItemId,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update packed quantities on sales order items
      for (const item of mappedItems) {
        await tx.salesOrderItem.update({
          where: { id: item.salesOrderItemId },
          data: {
            packedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // Refresh items to determine if fully packed
      const updatedItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: order.id },
      });

      const allPacked = updatedItems.every(
        (i) => i.packedQuantity >= i.quantity - 1e-6,
      );

      if (allPacked && order.status === SalesOrderStatus.CONFIRMED) {
        await tx.salesOrder.update({
          where: { id: order.id },
          data: { status: SalesOrderStatus.PACKED },
        });
      }

      if (order.customerId) {
        const activityType = allPacked
          ? "SALES_ORDER_PACKED"
          : "SALES_ORDER_PARTIALLY_PACKED";
        const title =
          activityType === "SALES_ORDER_PACKED"
            ? "Sales order packed"
            : "Sales order partially packed";

        try {
          await tx.customerActivityLog.create({
            data: {
              customerId: order.customerId,
              type: activityType,
              title,
              description: `Package ${packageNumber} created for sales order ${order.orderNumber}`,
              entityType: "SALES_ORDER",
              entityId: order.id,
            },
          });
        } catch (logError) {
          console.error("Failed to write package activity log:", logError);
        }
      }

      return created;
    });

    // If transaction handler already returned a NextResponse (for validation), pass it through
    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating package for sales order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

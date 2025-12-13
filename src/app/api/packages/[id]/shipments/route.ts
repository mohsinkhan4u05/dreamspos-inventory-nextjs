import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { PackageStatus, ShipmentStatus, ShipmentType, SalesOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(num) ? num : fallback;
}

interface ShipmentItemInput {
  packageItemId: string;
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

    const rawText = await request.text();
    let body: any = {};
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {
        body = {};
      }
    }

    const shipmentDate = body.shipmentDate ? new Date(body.shipmentDate) : new Date();
    const typeValue = String(body.type || "MANUAL").toUpperCase();
    const shipmentType: ShipmentType =
      Object.values(ShipmentType).includes(typeValue as ShipmentType)
        ? (typeValue as ShipmentType)
        : ShipmentType.MANUAL;

    const carrier = (body.carrier as string | undefined) ?? null;
    const trackingNumber = (body.trackingNumber as string | undefined) ?? null;
    const trackingUrl = (body.trackingUrl as string | undefined) ?? null;
    const shippingCharges = normalizeNumber(body.shippingCharges, 0);
    const notes = (body.notes as string | undefined) ?? null;
    const delivered = Boolean(body.delivered);
    const deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : null;
    const sendNotification = Boolean(body.sendNotification);

    const itemsInput = Array.isArray(body.items) ? (body.items as ShipmentItemInput[]) : [];

    const { id } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      const pkg = await tx.package.findUnique({
        where: { id },
        include: {
          salesOrder: {
            include: { items: true },
          },
          items: true,
        },
      });

      if (!pkg) {
        return NextResponse.json({ error: "Package not found" }, { status: 404 });
      }

      if (pkg.status === PackageStatus.CANCELLED || pkg.status === PackageStatus.DELIVERED) {
        return NextResponse.json(
          { error: "Cannot create shipment for cancelled or delivered package" },
          { status: 400 },
        );
      }

      const order = pkg.salesOrder;

      const sourceItems =
        itemsInput.length > 0
          ? itemsInput
          : pkg.items.map((it) => ({ packageItemId: it.id, quantity: it.quantity - it.shippedQuantity }));

      const shipmentItemsData: {
        packageItemId: string;
        salesOrderItemId: string;
        productId: string;
        variantId: string | null;
        quantity: number;
      }[] = [];

      for (const input of sourceItems) {
        const pkgItem = pkg.items.find((i) => i.id === input.packageItemId);
        if (!pkgItem) {
          return NextResponse.json(
            { error: `Invalid package item: ${input.packageItemId}` },
            { status: 400 },
          );
        }

        const quantity = normalizeNumber(input.quantity, 0);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          return NextResponse.json(
            { error: "Shipment quantity must be greater than zero" },
            { status: 400 },
          );
        }

        const remaining = pkgItem.quantity - pkgItem.shippedQuantity;
        if (quantity > remaining + 1e-6) {
          return NextResponse.json(
            { error: `Shipment quantity exceeds remaining for package item ${pkgItem.id}` },
            { status: 400 },
          );
        }

        shipmentItemsData.push({
          packageItemId: pkgItem.id,
          salesOrderItemId: pkgItem.salesOrderItemId,
          productId: pkgItem.productId,
          variantId: pkgItem.variantId,
          quantity,
        });
      }

      if (shipmentItemsData.length === 0) {
        return NextResponse.json(
          { error: "No shippable quantity found in package" },
          { status: 400 },
        );
      }

      const existingCount = await tx.shipment.count({ where: { storeId: pkg.storeId } });
      const shipmentNumber = `SHP-${String(existingCount + 1).padStart(5, "0")}`;

      const shipment = await tx.shipment.create({
        data: {
          shipmentNumber,
          salesOrderId: pkg.salesOrderId,
          packageId: pkg.id,
          storeId: pkg.storeId,
          shipmentDate,
          carrier,
          trackingNumber,
          trackingUrl,
          shippingCharges,
          notes,
          delivered,
          deliveredAt,
          sendNotification,
          status: delivered ? ShipmentStatus.DELIVERED : ShipmentStatus.SHIPPED,
          type: shipmentType,
          items: {
            create: shipmentItemsData.map((item) => ({
              packageItemId: item.packageItemId,
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

      // Update shipped qty on package items and sales order items
      for (const item of shipmentItemsData) {
        await tx.packageItem.update({
          where: { id: item.packageItemId },
          data: {
            shippedQuantity: {
              increment: item.quantity,
            },
          },
        });

        await tx.salesOrderItem.update({
          where: { id: item.salesOrderItemId },
          data: {
            shippedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      const refreshedPkg = await tx.package.findUnique({
        where: { id: pkg.id },
        include: { items: true },
      });

      if (refreshedPkg) {
        const allShipped = refreshedPkg.items.every(
          (i) => i.shippedQuantity >= i.quantity - 1e-6,
        );

        let newStatus: PackageStatus | null = null;
        if (allShipped && delivered) {
          newStatus = PackageStatus.DELIVERED;
        } else if (allShipped) {
          newStatus = PackageStatus.SHIPPED;
        } else {
          newStatus = PackageStatus.PARTIALLY_SHIPPED;
        }

        await tx.package.update({
          where: { id: pkg.id },
          data: { status: newStatus },
        });
      }

      // Update order shipping stage if all items shipped and order is still in an open stage
      const orderItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: order.id },
      });

      const allOrderItemsShipped = orderItems.every(
        (i) => i.shippedQuantity >= i.quantity - 1e-6,
      );

      if (
        allOrderItemsShipped &&
        (order.status === SalesOrderStatus.CONFIRMED ||
          order.status === SalesOrderStatus.PACKED ||
          order.status === SalesOrderStatus.SHIPPED)
      ) {
        await tx.salesOrder.update({
          where: { id: order.id },
          data: { status: SalesOrderStatus.SHIPPED },
        });
      }

      if (order.customerId) {
        const activityType = allOrderItemsShipped
          ? "SALES_ORDER_SHIPPED"
          : "SALES_ORDER_PARTIALLY_SHIPPED";
        const title =
          activityType === "SALES_ORDER_SHIPPED"
            ? "Sales order shipped"
            : "Sales order partially shipped";

        try {
          await tx.customerActivityLog.create({
            data: {
              customerId: order.customerId,
              type: activityType,
              title,
              description: `Shipment ${shipmentNumber} created for sales order ${order.orderNumber}`,
              entityType: "SALES_ORDER",
              entityId: order.id,
            },
          });
        } catch (logError) {
          console.error("Failed to write shipment activity log:", logError);
        }
      }

      return shipment;
    });

    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment from package:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { InsufficientStockError, applySale } from "@/lib/stockEngine";
import { PaymentMethod, PaymentStatus, SalesOrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(num) ? num : fallback;
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

    const tokenUserId = token.sub as string | undefined;
    let actorName = "System";

    if (tokenUserId) {
      const actor = await prisma.user.findUnique({ where: { id: tokenUserId } });
      if (actor) {
        const fullName = [actor.firstName, actor.lastName]
          .filter((part) => part && part.trim().length > 0)
          .join(" ")
          .trim();
        actorName = fullName || actor.username || actor.email || actorName;
      }
    }

    // Resolve route params
    const { id } = await context.params;

    // Body is optional; frontend may POST without any payload.
    // Use text() and parse only when non-empty to avoid JSON errors.
    let body: any = {};
    const raw = await request.text();
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        // Ignore malformed JSON and fall back to empty body
        body = {};
      }
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!salesOrder) {
      return NextResponse.json({ error: "Sales order not found" }, { status: 404 });
    }

    if (salesOrder.status === SalesOrderStatus.CANCELLED) {
      return NextResponse.json(
        { error: "Cancelled sales orders cannot be converted to invoices" },
        { status: 400 },
      );
    }

    // If called from a shipment, build the invoice items from that shipment's lines only.
    let shipmentQuantitiesBySoItemId: Record<string, number> | null = null;

    let sourceItems: any[];

    if (body.shipmentId && typeof body.shipmentId === "string") {
      const shipment = await prisma.shipment.findUnique({
        where: { id: body.shipmentId },
        include: {
          items: {
            include: {
              salesOrderItem: true,
            },
          },
        },
      });

      if (!shipment) {
        return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
      }

      if (shipment.salesOrderId !== salesOrder.id) {
        return NextResponse.json(
          { error: "Shipment does not belong to this sales order" },
          { status: 400 },
        );
      }

      shipmentQuantitiesBySoItemId = {};
      const itemsForShipment: any[] = [];

      for (const shItem of shipment.items) {
        const soItem = shItem.salesOrderItem as any;
        if (!soItem) continue;

        const alreadyPlanned = shipmentQuantitiesBySoItemId[soItem.id] ?? 0;
        const alreadyInvoiced = normalizeNumber(soItem.invoicedQuantity, 0);
        const remaining = normalizeNumber(soItem.quantity, 0) - alreadyInvoiced - alreadyPlanned;
        if (remaining <= 0) {
          continue;
        }

        const requested = normalizeNumber(shItem.quantity, 0);
        const quantityToInvoice = Math.min(requested, remaining);
        if (quantityToInvoice <= 0) {
          continue;
        }

        shipmentQuantitiesBySoItemId[soItem.id] = alreadyPlanned + quantityToInvoice;

        itemsForShipment.push({
          productId: soItem.productId,
          variantId: soItem.variantId,
          quantity: quantityToInvoice,
          rate: soItem.rate,
          discount: soItem.discount,
          taxRate: soItem.taxRate,
          taxAmount: soItem.taxAmount,
        });
      }

      if (itemsForShipment.length === 0) {
        return NextResponse.json(
          { error: "No remaining quantity to invoice for this shipment" },
          { status: 400 },
        );
      }

      sourceItems = itemsForShipment;
    } else {
      sourceItems =
        Array.isArray(body.items) && body.items.length > 0 ? body.items : salesOrder.items;
    }

    const saleItems = sourceItems.map((item: any) => {
      const quantity = normalizeNumber(item.quantity ?? item.quantity);
      const unitPrice = normalizeNumber(item.rate ?? item.unitPrice);
      const discount = normalizeNumber(item.discount);
      const taxRate = normalizeNumber(item.taxRate);
      const taxAmount = normalizeNumber(item.taxAmount);

      return {
        productId: String(item.productId),
        variantId: item.variantId ? String(item.variantId) : null,
        quantity,
        unitPrice,
        discount,
        taxRate,
        taxAmount,
        unitId: null,
      };
    });

    const discount = normalizeNumber(body.discount, salesOrder.discount);
    const taxAmount = normalizeNumber(body.taxAmount, salesOrder.taxAmount);
    const paidAmount = normalizeNumber(body.paidAmount, 0);

    const paymentMethod =
      (body.paymentMethod as PaymentMethod | undefined) ?? PaymentMethod.CASH;

    let paymentStatus: PaymentStatus | null = null;
    if (body.paymentStatus && Object.values(PaymentStatus).includes(body.paymentStatus)) {
      paymentStatus = body.paymentStatus as PaymentStatus;
    }

    try {
      // Ensure we have a valid userId that exists in the User table for POS session
      let userId = token.sub as string | undefined;
      if (userId) {
        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
          userId = undefined;
        }
      }

      if (!userId) {
        const fallbackUser = await prisma.user.findFirst();
        if (!fallbackUser) {
          return NextResponse.json(
            { error: "No user found to create POS session for invoice" },
            { status: 500 },
          );
        }
        userId = fallbackUser.id;
      }

      const invoice = await applySale({
        storeId: salesOrder.storeId,
        userId,
        customerId: salesOrder.customerId ?? null,
        customerName: salesOrder.customer?.name ?? null,
        customerEmail: salesOrder.customer?.email ?? null,
        customerPhone: salesOrder.customer?.phone ?? null,
        discount,
        taxAmount,
        paidAmount,
        notes: body.notes ?? null,
        paymentMethod,
        paymentStatus,
        items: saleItems,
        salesOrderId: salesOrder.id,
      } as any);

      const newStatus =
        invoice.paymentStatus === PaymentStatus.PAID
          ? SalesOrderStatus.CLOSED
          : SalesOrderStatus.INVOICED;

      const updatedOrder = await prisma.salesOrder.update({
        where: { id: salesOrder.id },
        data: {
          status: newStatus,
        },
      });

      if (shipmentQuantitiesBySoItemId) {
        // Increment invoicedQuantity only for the items included from this shipment
        await Promise.all(
          salesOrder.items.map((item) => {
            const increment = shipmentQuantitiesBySoItemId?.[item.id] ?? 0;
            if (increment <= 0) {
              return Promise.resolve();
            }
            const currentInvoiced = normalizeNumber((item as any).invoicedQuantity, 0);
            const newInvoiced = currentInvoiced + increment;

            return prisma.salesOrderItem.update({
              where: { id: item.id },
              data: { invoicedQuantity: newInvoiced },
            });
          }),
        );
      } else {
        // Default behavior: mark all items as fully invoiced
        await Promise.all(
          salesOrder.items.map((item) =>
            prisma.salesOrderItem.update({
              where: { id: item.id },
              data: { invoicedQuantity: item.quantity },
            }),
          ),
        );
      }

      if (salesOrder.customerId) {
        try {
          const isPaid = invoice.paymentStatus === PaymentStatus.PAID;
          const type = isPaid ? "SALES_ORDER_PAID" : "SALES_ORDER_INVOICED";
          const title = isPaid ? "Sales order paid" : "Sales order invoiced";
          const description = isPaid
            ? `Sales order ${salesOrder.orderNumber} was fully paid via invoice ${invoice.invoiceNumber} by ${actorName}`
            : `Sales order ${salesOrder.orderNumber} was invoiced as ${invoice.invoiceNumber} by ${actorName}`;

          await prisma.customerActivityLog.create({
            data: {
              customerId: salesOrder.customerId,
              type,
              title,
              description,
              entityType: "SALES_ORDER",
              entityId: salesOrder.id,
            },
          });
        } catch (logError) {
          console.error("Failed to write sales order invoice activity:", logError);
        }
      }

      return NextResponse.json({ invoice }, { status: 201 });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        return NextResponse.json(
          { error: "Insufficient stock for invoice" },
          { status: 400 },
        );
      }
      console.error("Error converting sales order to invoice:", error);
      const message =
        error instanceof Error ? error.message : "Failed to convert sales order";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error("Unexpected error converting sales order to invoice:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

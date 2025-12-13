import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  PaymentStatus,
  PurchaseOrderStatus,
  PurchaseStatus,
} from "@prisma/client";
import { logPurchaseBillAccountingEntry } from "@/lib/accountingEngine";

export const dynamic = "force-dynamic";

function normalizeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  return Number.isFinite(num) ? num : fallback;
}

interface BillFromPOItemInput {
  purchaseOrderItemId: string;
  quantity: number;
}

interface BillFromPOBody {
  purchaseOrderId?: string;
  items?: BillFromPOItemInput[];
  notes?: string | null;
  billNumber?: string | null;
  billDate?: string | null;
  expectedPaymentDate?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: BillFromPOBody = await request
      .json()
      .catch(() => ({}) as BillFromPOBody);

    const purchaseOrderId = body.purchaseOrderId;

    if (!purchaseOrderId) {
      return NextResponse.json(
        { error: "purchaseOrderId is required" },
        { status: 400 },
      );
    }

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        items: true,
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 },
      );
    }

    if (
      order.status === PurchaseOrderStatus.CANCELLED ||
      order.status === PurchaseOrderStatus.CLOSED ||
      order.status === PurchaseOrderStatus.BILLED
    ) {
      return NextResponse.json(
        {
          error: `You can't bill this purchase order in its current status (${order.status}).`,
        },
        { status: 400 },
      );
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        { error: "This purchase order has no items to bill." },
        { status: 400 },
      );
    }

    const remainingById = new Map<string, number>();
    for (const item of order.items) {
      const remaining = item.quantity - item.billedQuantity;
      if (remaining > 0) {
        remainingById.set(item.id, remaining);
      }
    }

    if (remainingById.size === 0) {
      return NextResponse.json(
        { error: "All items are already fully billed for this purchase order." },
        { status: 400 },
      );
    }

    type BillLine = {
      purchaseOrderItemId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      taxRate: number;
      taxAmount: number;
    };

    const itemsInput: BillFromPOItemInput[] = Array.isArray(body.items)
      ? body.items
      : [];

    const lines: BillLine[] = [];

    if (itemsInput.length > 0) {
      for (const input of itemsInput) {
        const baseItem = order.items.find(
          (i) => i.id === input.purchaseOrderItemId,
        );
        if (!baseItem) {
          return NextResponse.json(
            {
              error:
                "One or more selected items could not be found for this purchase order.",
            },
            { status: 400 },
          );
        }

        const remaining = remainingById.get(baseItem.id) ?? 0;
        const qty = normalizeNumber(input.quantity, 0);

        if (qty <= 0) {
          continue;
        }

        if (qty > remaining) {
          return NextResponse.json(
            {
              error:
                "Billed quantity exceeds the remaining quantity for one or more items.",
            },
            { status: 400 },
          );
        }

        const perDiscount =
          baseItem.quantity > 0 ? baseItem.discount / baseItem.quantity : 0;
        const perTaxAmount =
          baseItem.quantity > 0 ? baseItem.taxAmount / baseItem.quantity : 0;

        lines.push({
          purchaseOrderItemId: baseItem.id,
          productId: baseItem.productId,
          quantity: qty,
          unitPrice: baseItem.rate,
          discount: perDiscount * qty,
          taxRate: baseItem.taxRate,
          taxAmount: perTaxAmount * qty,
        });
      }
    } else {
      for (const item of order.items) {
        const remaining = remainingById.get(item.id) ?? 0;
        if (remaining <= 0) continue;

        const perDiscount = item.quantity > 0 ? item.discount / item.quantity : 0;
        const perTaxAmount =
          item.quantity > 0 ? item.taxAmount / item.quantity : 0;

        lines.push({
          purchaseOrderItemId: item.id,
          productId: item.productId,
          quantity: remaining,
          unitPrice: item.rate,
          discount: perDiscount * remaining,
          taxRate: item.taxRate,
          taxAmount: perTaxAmount * remaining,
        });
      }
    }

    if (lines.length === 0) {
      return NextResponse.json(
        {
          error: "Please enter a quantity to bill for at least one item.",
        },
        { status: 400 },
      );
    }

    const subtotal = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );
    const totalDiscount = lines.reduce((sum, line) => sum + line.discount, 0);
    const totalTax = lines.reduce((sum, line) => sum + line.taxAmount, 0);
    const totalAmount = subtotal - totalDiscount + totalTax;

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: "Total bill amount must be greater than zero." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const billNumber =
        body.billNumber && body.billNumber.trim().length > 0
          ? body.billNumber.trim()
          : `PUR-${Date.now()}`;

      const purchase = await tx.purchase.create({
        data: {
          orderNumber: billNumber,
          supplierId: order.supplierId ?? null,
          storeId: order.storeId,
          subtotal,
          discount: totalDiscount,
          taxAmount: totalTax,
          totalAmount,
          paidAmount: 0,
          dueAmount: totalAmount,
          paymentStatus: PaymentStatus.PENDING,
          status: PurchaseStatus.RECEIVED,
          expectedDate: body.expectedPaymentDate
            ? new Date(body.expectedPaymentDate)
            : null,
          receivedDate: body.billDate ? new Date(body.billDate) : new Date(),
          notes: body.notes ?? null,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              totalPrice: line.quantity * line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
            })),
          },
        },
      });

      await logPurchaseBillAccountingEntry(tx, {
        storeId: order.storeId,
        amount: totalAmount,
        purchaseId: purchase.id,
        purchaseOrderId: order.id,
        narration: `Bill ${purchase.orderNumber} recorded for purchase order ${order.orderNumber}`,
      });

      for (const line of lines) {
        await tx.purchaseOrderItem.update({
          where: { id: line.purchaseOrderItemId },
          data: {
            billedQuantity: {
              increment: line.quantity,
            },
          },
        });
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: order.id },
      });

      const allFullyBilled = updatedItems.every(
        (item) => item.billedQuantity >= item.quantity,
      );

      const newStatus = allFullyBilled
        ? PurchaseOrderStatus.BILLED
        : PurchaseOrderStatus.PARTIALLY_BILLED;

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: newStatus,
        },
      });

      if (order.supplierId) {
        try {
          await tx.supplierActivityLog.create({
            data: {
              supplierId: order.supplierId,
              type: allFullyBilled
                ? "PURCHASE_ORDER_BILLED"
                : "PURCHASE_ORDER_PARTIALLY_BILLED",
              title: allFullyBilled
                ? "Purchase order billed"
                : "Purchase order partially billed",
              description: `Bill ${purchase.orderNumber} recorded for purchase order ${order.orderNumber}`,
              entityType: "PURCHASE_ORDER",
              entityId: order.id,
            },
          });
        } catch (err) {
          console.error(
            "Failed to log supplier activity for purchase order billing via bill",
            err,
          );
        }
      }

      return {
        billId: purchase.id,
        billNumber: purchase.orderNumber,
        status: newStatus,
      };
    });

    return NextResponse.json({
      billId: result.billId,
      billNumber: result.billNumber,
      purchaseOrderId: order.id,
      status: result.status,
    });
  } catch (error) {
    console.error("Error creating bill from purchase order:", error);
    return NextResponse.json(
      {
        error:
          "Something went wrong while converting this purchase order to a bill.",
      },
      { status: 500 },
    );
  }
}

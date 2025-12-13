import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { PaymentMethod, PaymentStatus, PurchaseStatus } from "@prisma/client";
import { logPurchasePaymentAccountingEntry } from "@/lib/accountingEngine";

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

    const payments = await prisma.payment.findMany({
      where: { purchaseId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: payments });
  } catch (error) {
    console.error("Error fetching purchase payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await request.text();
    let body: unknown = {};

    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }

    const input = body as {
      amount?: unknown;
      paymentMethod?: unknown;
      notes?: unknown;
      reference?: unknown;
    };

    const amountValue =
      typeof input.amount === "string"
        ? parseFloat(input.amount)
        : Number(input.amount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    const { id } = await context.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (
      purchase.status === PurchaseStatus.CANCELLED ||
      purchase.status === PurchaseStatus.RETURNED
    ) {
      return NextResponse.json(
        { error: "Cancelled or returned bills cannot receive payments" },
        { status: 400 },
      );
    }

    const remaining = purchase.totalAmount - purchase.paidAmount;

    if (remaining <= 0) {
      return NextResponse.json(
        { error: "Bill is already fully paid" },
        { status: 400 },
      );
    }

    if (amountValue - remaining > 0.01) {
      return NextResponse.json(
        { error: "Payment amount cannot exceed due amount" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const freshPurchase = await tx.purchase.findUnique({
        where: { id: purchase.id },
      });

      if (!freshPurchase) {
        throw new Error("BILL_NOT_FOUND");
      }

      if (
        freshPurchase.status === PurchaseStatus.CANCELLED ||
        freshPurchase.status === PurchaseStatus.RETURNED
      ) {
        throw new Error("BILL_NOT_PAYABLE");
      }

      const freshRemaining = freshPurchase.totalAmount - freshPurchase.paidAmount;

      if (freshRemaining <= 0) {
        throw new Error("BILL_ALREADY_PAID");
      }

      if (amountValue - freshRemaining > 0.01) {
        throw new Error("PAYMENT_EXCEEDS_DUE");
      }

      const rawMethod = input.paymentMethod;
      const methodString =
        typeof rawMethod === "string" && rawMethod.trim().length > 0
          ? rawMethod.trim().toUpperCase()
          : "CASH";

      const effectiveMethod: PaymentMethod =
        Object.values(PaymentMethod).includes(methodString as PaymentMethod)
          ? (methodString as PaymentMethod)
          : PaymentMethod.CASH;

      const newPaidAmount = freshPurchase.paidAmount + amountValue;
      const newDueAmount = Math.max(
        0,
        freshPurchase.totalAmount - newPaidAmount,
      );

      let newPaymentStatus: PaymentStatus;
      if (newPaidAmount === 0) {
        newPaymentStatus = PaymentStatus.PENDING;
      } else if (newPaidAmount < freshPurchase.totalAmount) {
        newPaymentStatus = PaymentStatus.PARTIAL;
      } else {
        newPaymentStatus = PaymentStatus.PAID;
      }

      const referenceString =
        typeof input.reference === "string" && input.reference.trim().length > 0
          ? input.reference.trim()
          : freshPurchase.orderNumber;

      const notesString =
        typeof input.notes === "string" && input.notes.trim().length > 0
          ? input.notes.trim()
          : null;

      const payment = await tx.payment.create({
        data: {
          purchaseId: freshPurchase.id,
          amount: amountValue,
          paymentMethod: effectiveMethod,
          status: newPaymentStatus,
          reference: referenceString,
          notes: notesString,
        },
      });

      const updatedPurchase = await tx.purchase.update({
        where: { id: freshPurchase.id },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          paymentStatus: newPaymentStatus,
        },
      });

      if (freshPurchase.supplierId) {
        try {
          await tx.supplierActivityLog.create({
            data: {
              supplierId: freshPurchase.supplierId,
              type: "PAYMENT_MADE",
              title: "Payment made",
              description: `Payment of ${amountValue.toFixed(2)} made for bill ${freshPurchase.orderNumber}`,
              entityType: "PAYMENT",
              entityId: payment.id,
            },
          });
        } catch (logError) {
          console.error(
            "Failed to write supplier payment activity log:",
            logError,
          );
        }
      }

      await logPurchasePaymentAccountingEntry(tx, {
        storeId: freshPurchase.storeId,
        amount: amountValue,
        purchaseId: freshPurchase.id,
        paymentId: payment.id,
        method: effectiveMethod,
        narration: `Payment of ${amountValue.toFixed(2)} for bill ${freshPurchase.orderNumber}`,
      });

      return { payment, purchase: updatedPurchase };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "BILL_ALREADY_PAID") {
        return NextResponse.json(
          { error: "Bill is already fully paid" },
          { status: 400 },
        );
      }
      if (error.message === "PAYMENT_EXCEEDS_DUE") {
        return NextResponse.json(
          { error: "Payment amount cannot exceed due amount" },
          { status: 400 },
        );
      }
      if (error.message === "BILL_NOT_PAYABLE") {
        return NextResponse.json(
          {
            error:
              "This bill cannot receive payments in its current status.",
          },
          { status: 400 },
        );
      }
    }

    console.error("Error recording purchase payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

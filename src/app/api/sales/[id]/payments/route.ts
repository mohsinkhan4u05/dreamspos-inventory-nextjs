import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { PaymentMethod, PaymentStatus, SalesOrderStatus } from "@prisma/client"
import { applyFifoCostForSale } from "@/lib/stockEngine"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawBody = await request.text()
    let body: unknown = {}
    if (rawBody) {
      try {
        body = JSON.parse(rawBody)
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      }
    }

    const input = body as { amount?: unknown; paymentMethod?: unknown; notes?: unknown }

    const amountValue =
      typeof input.amount === "string" ? parseFloat(input.amount) : Number(input.amount)

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      )
    }

    const { id } = await context.params

    const sale = await prisma.sale.findUnique({
      where: { id },
    })

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 })
    }

    if (sale.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cancelled invoices cannot receive payments" },
        { status: 400 },
      )
    }

    const remaining = sale.totalAmount - sale.paidAmount

    if (remaining <= 0) {
      return NextResponse.json(
        { error: "Invoice is already fully paid" },
        { status: 400 },
      )
    }

    if (amountValue - remaining > 0.01) {
      return NextResponse.json(
        { error: "Payment amount cannot exceed due amount" },
        { status: 400 },
      )
    }

    const tokenUserId = token.sub as string | undefined
    let effectiveUserId: string | null = null

    if (tokenUserId) {
      const existing = await prisma.user.findUnique({ where: { id: tokenUserId } })
      if (existing) {
        effectiveUserId = existing.id
      }
    }

    if (!effectiveUserId) {
      const fallbackUser = await prisma.user.findFirst()
      if (!fallbackUser) {
        return NextResponse.json(
          { error: "No user found to create POS session for payment" },
          { status: 500 },
        )
      }
      effectiveUserId = fallbackUser.id
    }

    const result = await prisma.$transaction(async (tx) => {
      const freshSale = await tx.sale.findUnique({ where: { id: sale.id } })
      if (!freshSale) {
        throw new Error("SALE_NOT_FOUND")
      }

      const freshRemaining = freshSale.totalAmount - freshSale.paidAmount
      if (freshRemaining <= 0) {
        throw new Error("INVOICE_ALREADY_PAID")
      }
      if (amountValue - freshRemaining > 0.01) {
        throw new Error("PAYMENT_EXCEEDS_DUE")
      }

      let session = await tx.pOSSession.findFirst({
        where: {
          userId: effectiveUserId!,
          storeId: freshSale.storeId,
          isActive: true,
        },
        orderBy: { openingDate: "desc" },
      })

      if (!session) {
        session = await tx.pOSSession.create({
          data: {
            userId: effectiveUserId!,
            storeId: freshSale.storeId,
            openingCash: 0,
            isActive: true,
            notes: "Auto-created session for payment",
          },
        })
      }

      const rawMethod = input.paymentMethod
      const methodString =
        typeof rawMethod === "string" && rawMethod.trim().length > 0
          ? rawMethod.trim().toUpperCase()
          : "CASH"

      const effectiveMethod: PaymentMethod =
        Object.values(PaymentMethod).includes(methodString as PaymentMethod)
          ? (methodString as PaymentMethod)
          : PaymentMethod.CASH

      const newPaidAmount = freshSale.paidAmount + amountValue
      const newDueAmount = Math.max(0, freshSale.totalAmount - newPaidAmount)

      let newPaymentStatus: PaymentStatus
      if (newPaidAmount === 0) {
        newPaymentStatus = PaymentStatus.PENDING
      } else if (newPaidAmount < freshSale.totalAmount) {
        newPaymentStatus = PaymentStatus.PARTIAL
      } else {
        newPaymentStatus = PaymentStatus.PAID
      }

      const payment = await tx.payment.create({
        data: {
          saleId: freshSale.id,
          sessionId: session.id,
          amount: amountValue,
          paymentMethod: effectiveMethod,
          status: newPaymentStatus,
          reference: freshSale.invoiceNumber,
          notes:
            typeof input.notes === "string" && input.notes.trim().length > 0
              ? input.notes.trim()
              : null,
        },
      })

      const updatedSale = await tx.sale.update({
        where: { id: freshSale.id },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          paymentStatus: newPaymentStatus,
        },
        include: {
          items: true,
        },
      })

      if (!freshSale.stockDeducted && newPaymentStatus === PaymentStatus.PAID) {
        await applyFifoCostForSale(tx, updatedSale)
      }

      if (freshSale.salesOrderId) {
        let newOrderStatus: SalesOrderStatus | null = null

        if (newPaymentStatus === PaymentStatus.PAID) {
          newOrderStatus = SalesOrderStatus.CLOSED
        } else if (newPaymentStatus === PaymentStatus.PARTIAL) {
          newOrderStatus = SalesOrderStatus.PARTIALLY_PAID
        }

        if (newOrderStatus) {
          await tx.salesOrder.update({
            where: { id: freshSale.salesOrderId },
            data: {
              status: newOrderStatus,
            },
          })
        }
      }

      if (freshSale.customerId) {
        try {
          await tx.customerActivityLog.create({
            data: {
              customerId: freshSale.customerId,
              type: "PAYMENT_RECEIVED",
              title: "Payment received",
              description: `Payment of ${amountValue.toFixed(2)} received for invoice ${freshSale.invoiceNumber}`,
              entityType: "PAYMENT",
              entityId: payment.id,
            },
          })
        } catch (logError) {
          console.error("Failed to write payment activity log:", logError)
        }
      }

      return { payment, sale: updatedSale }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVOICE_ALREADY_PAID") {
        return NextResponse.json(
          { error: "Invoice is already fully paid" },
          { status: 400 },
        )
      }
      if (error.message === "PAYMENT_EXCEEDS_DUE") {
        return NextResponse.json(
          { error: "Payment amount cannot exceed due amount" },
          { status: 400 },
        )
      }
    }

    console.error("Error recording payment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

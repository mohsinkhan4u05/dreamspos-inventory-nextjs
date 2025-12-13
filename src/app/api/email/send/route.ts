import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { PurchaseOrderStatus, type OrganizationProfile } from "@prisma/client";
import { sendEmail, type EmailAttachment, type EmailPayload } from "../../../../../server/email/sendEmail";
import type { OrgInfo } from "../../../../../server/email/templates/types";
import { genericEmailTemplate } from "../../../../../server/email/templates/genericEmailTemplate";
import { purchaseOrderEmailTemplate } from "../../../../../server/email/templates/purchaseOrderEmailTemplate";
import { invoiceEmailTemplate } from "../../../../../server/email/templates/invoiceEmailTemplate";
import { salesOrderEmailTemplate } from "../../../../../server/email/templates/salesOrderEmailTemplate";
import { paymentReceiptEmailTemplate } from "../../../../../server/email/templates/paymentReceiptEmailTemplate";
import {
  generateInvoicePdf,
  generatePaymentReceiptPdf,
  generatePurchaseOrderPdf,
  generateSalesOrderPdf,
} from "../../../../../server/email/pdfGenerators";

export const dynamic = "force-dynamic";

type EmailType =
  | "INVOICE"
  | "PURCHASE_ORDER"
  | "SALES_ORDER"
  | "PAYMENT_RECEIPT"
  | "GENERIC";

interface AttachmentInput {
  filename: string;
  content?: string;
  path?: string;
  contentType?: string;
  size?: number;
}

interface EmailSendRequestBody {
  type?: EmailType;
  entityId?: string;

  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];

  subject?: string;
  message?: string;

  attachments?: AttachmentInput[];
  includePdf?: boolean;
}

const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT = 20; // emails per org per window

type RateState = { windowStart: number; count: number };
const orgRateState = new Map<string, RateState>();

function checkRateLimit(orgKey: string): boolean {
  const now = Date.now();
  const state = orgRateState.get(orgKey);
  if (!state || now - state.windowStart > RATE_WINDOW_MS) {
    orgRateState.set(orgKey, { windowStart: now, count: 1 });
    return true;
  }
  if (state.count >= RATE_LIMIT) return false;
  state.count += 1;
  return true;
}

async function sendWithRateLimit(
  orgKey: string,
  payload: EmailPayload,
): Promise<{ success: boolean; error?: string }> {
  if (!checkRateLimit(orgKey)) {
    return {
      success: false,
      error: "Email rate limit exceeded. Please try again in a moment.",
    };
  }
  return sendEmail(payload);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmails(value?: string | string[]): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(/[,;]+/);
  return raw
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function mapOrgToOrgInfo(org: OrganizationProfile | null): OrgInfo | null {
  if (!org) return null;
  return {
    name: org.name,
    companyId: org.companyId,
    logoUrl: org.logoUrl,
    primaryContactName: org.primaryContactName,
    primaryContactEmail: org.primaryContactEmail,
    primaryContactPhone: org.primaryContactPhone,
    addressLine1: org.addressLine1,
    addressLine2: org.addressLine2,
    city: org.city,
    state: org.state,
    zipCode: org.zipCode,
    location: org.location,
  };
}

function validateAttachments(inputs: AttachmentInput[]): {
  ok: boolean;
  error?: string;
  attachments?: EmailAttachment[];
} {
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file

  const attachments: EmailAttachment[] = [];

  for (const input of inputs) {
    const size = input.size;
    if (typeof size === "number" && size > MAX_SIZE_BYTES) {
      return {
        ok: false,
        error: `Attachment ${input.filename} exceeds the 10MB size limit`,
      };
    }

    let content: Buffer | undefined;

    if (input.content) {
      try {
        const base64 = input.content.startsWith("data:")
          ? input.content.split(",")[1] || ""
          : input.content;
        content = Buffer.from(base64, "base64");
        if (content.byteLength > MAX_SIZE_BYTES) {
          return {
            ok: false,
            error: `Attachment ${input.filename} exceeds the 10MB size limit`,
          };
        }
      } catch {
        return {
          ok: false,
          error: `Attachment ${input.filename} has invalid base64 content`,
        };
      }
    }

    attachments.push({
      filename: input.filename,
      content,
      path: input.path,
      contentType: input.contentType,
    });
  }

  return { ok: true, attachments };
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

    const body: EmailSendRequestBody = await request
      .json()
      .catch(() => ({} as EmailSendRequestBody));

    if (!body.type) {
      return NextResponse.json(
        { error: "Email 'type' is required" },
        { status: 400 },
      );
    }

    const orgRecord = await prisma.organizationProfile.findFirst();
    const org = mapOrgToOrgInfo(orgRecord || null);
    const orgKey = orgRecord?.id ?? "global";
    const orgReplyTo =
      org?.primaryContactEmail
        ? org.primaryContactName
          ? `${org.primaryContactName} <${org.primaryContactEmail}>`
          : org.primaryContactEmail
        : undefined;
    const orgFromName = org?.primaryContactName || undefined;
    const orgFromEmail = org?.primaryContactEmail || undefined;

    const attachmentValidation = validateAttachments(body.attachments || []);
    if (!attachmentValidation.ok) {
      return NextResponse.json(
        { error: attachmentValidation.error },
        { status: 400 },
      );
    }

    const commonCc = normalizeEmails(body.cc);
    const commonBcc = normalizeEmails(body.bcc);

    let toList: string[] = [];
    let subject = body.subject?.trim() || "";
    let html = "";
    let text = "";

    switch (body.type) {
      case "GENERIC": {
        const explicitTo = normalizeEmails(body.to);
        if (explicitTo.length === 0) {
          return NextResponse.json(
            { error: "At least one recipient email is required" },
            { status: 400 },
          );
        }

        for (const addr of explicitTo) {
          if (!isValidEmail(addr)) {
            return NextResponse.json(
              { error: `Invalid email address: ${addr}` },
              { status: 400 },
            );
          }
        }

        if (!body.subject || !body.subject.trim()) {
          return NextResponse.json(
            { error: "Subject is required for generic emails" },
            { status: 400 },
          );
        }
        if (!body.message || !body.message.trim()) {
          return NextResponse.json(
            { error: "Message body is required for generic emails" },
            { status: 400 },
          );
        }

        const template = genericEmailTemplate({
          org,
          subject: body.subject,
          messageHtml: body.message,
        });
        toList = explicitTo;
        subject = template.subject;
        html = template.html;
        text = template.text;

        const sendResult = await sendWithRateLimit(orgKey, {
          to: toList,
          cc: commonCc,
          bcc: commonBcc,
          subject,
          html,
          text,
          attachments: attachmentValidation.attachments,
          replyTo: orgReplyTo,
          fromName: orgFromName,
          fromEmail: orgFromEmail,
        });

        if (!sendResult.success) {
          const status = (sendResult.error || "").includes("rate limit")
            ? 429
            : 502;
          return NextResponse.json(
            { error: sendResult.error || "Failed to send email" },
            { status },
          );
        }

        return NextResponse.json({
          success: true,
          message: "Email sent successfully",
          entityType: body.type,
          entityId: body.entityId ?? null,
          to: toList,
          subject,
        });
      }

      case "PURCHASE_ORDER": {
        if (!body.entityId) {
          return NextResponse.json(
            { error: "entityId is required for PURCHASE_ORDER emails" },
            { status: 400 },
          );
        }

        const order = await prisma.purchaseOrder.findUnique({
          where: { id: body.entityId },
          include: {
            supplier: {
              select: { name: true, email: true },
            },
            store: {
              select: { name: true },
            },
            items: {
              include: {
                product: {
                  select: { name: true },
                },
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

        const explicitTo = normalizeEmails(body.to);
        const fallbackTo = normalizeEmails(
          order.emailRecipients || order.supplier?.email || undefined,
        );
        toList = explicitTo.length > 0 ? explicitTo : fallbackTo;

        if (toList.length === 0) {
          return NextResponse.json(
            {
              error:
                "No recipient email is configured. Please provide at least one email address.",
            },
            { status: 400 },
          );
        }

        for (const addr of toList) {
          if (!isValidEmail(addr)) {
            return NextResponse.json(
              { error: `Invalid email address: ${addr}` },
              { status: 400 },
            );
          }
        }

        const poItems =
          order.items?.map((item) => ({
            name: item.product?.name || item.productId,
            quantity: item.quantity,
            unitPrice: item.rate,
            totalPrice: item.totalAmount,
          })) || [];

        const template = purchaseOrderEmailTemplate({
          org,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          supplierName: order.supplier?.name,
          supplierEmail: toList[0],
          storeName: order.store?.name,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          customMessage: body.message,
        });
        subject = body.subject?.trim() || template.subject;
        html = template.html;
        text = template.text;

        let attachments = attachmentValidation.attachments ?? [];

        if (body.includePdf) {
          const pdfAttachment = await generatePurchaseOrderPdf({
            org,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            supplierName: order.supplier?.name,
            storeName: order.store?.name,
            subtotal: order.subtotal,
            taxAmount: order.taxAmount,
            totalAmount: order.totalAmount,
            items: poItems,
          });
          attachments = [...attachments, pdfAttachment];
        }

        const sendResult = await sendWithRateLimit(orgKey, {
          to: toList,
          cc: commonCc,
          bcc: commonBcc,
          subject,
          html,
          text,
          attachments,
          replyTo: orgReplyTo,
        });

        if (!sendResult.success) {
          const status = (sendResult.error || "").includes("rate limit")
            ? 429
            : 502;
          return NextResponse.json(
            { error: sendResult.error || "Failed to send email" },
            { status },
          );
        }

        const updated = await prisma.purchaseOrder.update({
          where: { id: order.id },
          data: {
            // There is no explicit ISSUED status in the schema; OPEN is used as the issued/active state.
            status: PurchaseOrderStatus.OPEN,
            emailRecipients: toList.join(", "),
          },
        });

        if (order.supplierId) {
          try {
            await prisma.supplierActivityLog.create({
              data: {
                supplierId: order.supplierId,
                type: "PURCHASE_ORDER_SENT",
                title: "Purchase order sent",
                description: `Purchase order ${order.orderNumber} sent to ${toList.join(", ")}`,
                entityType: "PURCHASE_ORDER",
                entityId: order.id,
              },
            });
          } catch (err) {
            console.error(
              "Failed to log supplier activity for purchase order email",
              err,
            );
          }
        }

        return NextResponse.json({
          success: true,
          message: "Email sent successfully",
          entityType: body.type,
          entityId: updated.id,
          to: toList,
          subject,
        });
      }

      case "SALES_ORDER": {
        if (!body.entityId) {
          return NextResponse.json(
            { error: "entityId is required for SALES_ORDER emails" },
            { status: 400 },
          );
        }

        const order = await prisma.salesOrder.findUnique({
          where: { id: body.entityId },
          include: {
            customer: {
              select: { name: true, email: true },
            },
            store: {
              select: { name: true },
            },
            items: {
              include: {
                product: {
                  select: { name: true },
                },
              },
            },
          },
        });

        if (!order) {
          return NextResponse.json(
            { error: "Sales order not found" },
            { status: 404 },
          );
        }

        const explicitTo = normalizeEmails(body.to);
        const fallbackTo = normalizeEmails(
          order.emailRecipients || order.customer?.email || undefined,
        );
        toList = explicitTo.length > 0 ? explicitTo : fallbackTo;

        if (toList.length === 0) {
          return NextResponse.json(
            {
              error:
                "No recipient email is configured. Please provide at least one email address.",
            },
            { status: 400 },
          );
        }

        for (const addr of toList) {
          if (!isValidEmail(addr)) {
            return NextResponse.json(
              { error: `Invalid email address: ${addr}` },
              { status: 400 },
            );
          }
        }

        const soItems =
          order.items?.map((item) => ({
            name: item.product?.name || item.productId,
            quantity: item.quantity,
            rate: item.rate,
            totalPrice: item.totalAmount,
          })) || [];

        const template = salesOrderEmailTemplate({
          org,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          customerName: order.customer?.name,
          customerEmail: toList[0],
          storeName: order.store?.name,
          totalAmount: order.totalAmount,
          customMessage: body.message,
        });

        subject = body.subject?.trim() || template.subject;
        html = template.html;
        text = template.text;

        let attachments = attachmentValidation.attachments ?? [];

        if (body.includePdf) {
          const pdfAttachment = await generateSalesOrderPdf({
            org,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            customerName: order.customer?.name,
            storeName: order.store?.name,
            subtotal: order.subtotal,
            discount: order.discount,
            taxAmount: order.taxAmount,
            totalAmount: order.totalAmount,
            items: soItems,
          });
          attachments = [...attachments, pdfAttachment];
        }

        const sendResult = await sendWithRateLimit(orgKey, {
          to: toList,
          cc: commonCc,
          bcc: commonBcc,
          subject,
          html,
          text,
          attachments,
        });

        if (!sendResult.success) {
          const status = (sendResult.error || "").includes("rate limit")
            ? 429
            : 502;
          return NextResponse.json(
            { error: sendResult.error || "Failed to send email" },
            { status },
          );
        }

        // Optionally: log customer activity similar to invoices
        if (order.customerId) {
          try {
            await prisma.customerActivityLog.create({
              data: {
                customerId: order.customerId,
                type: "SALES_ORDER_EMAIL_SENT",
                title: "Sales order sent",
                description: `Sales order ${order.orderNumber} sent to ${toList.join(", ")}`,
                entityType: "SALES_ORDER",
                entityId: order.id,
              },
            });
          } catch (err) {
            console.error(
              "Failed to log customer activity for sales order email",
              err,
            );
          }
        }

        return NextResponse.json({
          success: true,
          message: "Email sent successfully",
          entityType: body.type,
          entityId: order.id,
          to: toList,
          subject,
        });
      }

      case "INVOICE": {
        if (!body.entityId) {
          return NextResponse.json(
            { error: "entityId is required for INVOICE emails" },
            { status: 400 },
          );
        }

        const sale = await prisma.sale.findUnique({
          where: { id: body.entityId },
          include: {
            customer: {
              select: { name: true, email: true },
            },
            store: {
              select: { name: true },
            },
            items: {
              include: {
                product: {
                  select: { name: true },
                },
              },
            },
          },
        });

        if (!sale) {
          return NextResponse.json(
            { error: "Invoice not found" },
            { status: 404 },
          );
        }

        const explicitTo = normalizeEmails(body.to);
        const fallbackTo = normalizeEmails(
          sale.customerEmail || sale.customer?.email || undefined,
        );
        toList = explicitTo.length > 0 ? explicitTo : fallbackTo;

        if (toList.length === 0) {
          return NextResponse.json(
            {
              error:
                "No recipient email is configured. Please provide at least one email address.",
            },
            { status: 400 },
          );
        }

        for (const addr of toList) {
          if (!isValidEmail(addr)) {
            return NextResponse.json(
              { error: `Invalid email address: ${addr}` },
              { status: 400 },
            );
          }
        }

        const invoiceItems = sale.items.map((item) => ({
          name: item.product?.name || item.productId,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        }));

        const template = invoiceEmailTemplate({
          org,
          invoiceNumber: sale.invoiceNumber,
          invoiceDate: sale.saleDate || sale.createdAt,
          customerName: sale.customer?.name,
          customerEmail: toList[0],
          storeName: sale.store?.name,
          subtotal: sale.subtotal,
          discount: sale.discount,
          taxAmount: sale.taxAmount,
          totalAmount: sale.totalAmount,
          dueAmount: sale.dueAmount,
          items: invoiceItems,
          customMessage: body.message,
        });

        subject = body.subject?.trim() || template.subject;
        html = template.html;
        text = template.text;

        let attachments = attachmentValidation.attachments ?? [];

        if (body.includePdf) {
          const pdfAttachment = await generateInvoicePdf({
            org,
            invoiceNumber: sale.invoiceNumber,
            invoiceDate: sale.saleDate || sale.createdAt,
            customerName: sale.customer?.name,
            storeName: sale.store?.name,
            subtotal: sale.subtotal,
            discount: sale.discount,
            taxAmount: sale.taxAmount,
            totalAmount: sale.totalAmount,
            dueAmount: sale.dueAmount,
            items: invoiceItems,
          });
          attachments = [...attachments, pdfAttachment];
        }

        const sendResult = await sendWithRateLimit(orgKey, {
          to: toList,
          cc: commonCc,
          bcc: commonBcc,
          subject,
          html,
          text,
          attachments,
        });

        if (!sendResult.success) {
          const status = (sendResult.error || "").includes("rate limit")
            ? 429
            : 502;
          return NextResponse.json(
            { error: sendResult.error || "Failed to send email" },
            { status },
          );
        }

        // There is no explicit "DELIVERED" status for invoices in the schema.
        // Instead, we record an activity log entry for traceability.
        if (sale.customerId) {
          try {
            await prisma.customerActivityLog.create({
              data: {
                customerId: sale.customerId,
                type: "INVOICE_EMAIL_SENT",
                title: "Invoice sent",
                description: `Invoice ${sale.invoiceNumber} sent to ${toList.join(", ")}`,
                entityType: "INVOICE",
                entityId: sale.id,
              },
            });
          } catch (err) {
            console.error(
              "Failed to log customer activity for invoice email",
              err,
            );
          }
        }

        return NextResponse.json({
          success: true,
          message: "Email sent successfully",
          entityType: body.type,
          entityId: sale.id,
          to: toList,
          subject,
        });
      }

      case "SALES_ORDER": {
        if (!body.entityId) {
          return NextResponse.json(
            { error: "entityId is required for SALES_ORDER emails" },
            { status: 400 },
          );
        }

        const order = await prisma.salesOrder.findUnique({
          where: { id: body.entityId },
          include: {
            customer: {
              select: { name: true, email: true },
            },
            store: {
              select: { name: true },
            },
          },
        });

        if (!order) {
          return NextResponse.json(
            { error: "Sales order not found" },
            { status: 404 },
          );
        }

        const explicitTo = normalizeEmails(body.to);
        const fallbackTo = normalizeEmails(
          order.emailRecipients || order.customer?.email || undefined,
        );
        toList = explicitTo.length > 0 ? explicitTo : fallbackTo;

        if (toList.length === 0) {
          return NextResponse.json(
            {
              error:
                "No recipient email is configured. Please provide at least one email address.",
            },
            { status: 400 },
          );
        }

        for (const addr of toList) {
          if (!isValidEmail(addr)) {
            return NextResponse.json(
              { error: `Invalid email address: ${addr}` },
              { status: 400 },
            );
          }
        }

        const template = salesOrderEmailTemplate({
          org,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          customerName: order.customer?.name,
          customerEmail: toList[0],
          storeName: order.store?.name,
          totalAmount: order.totalAmount,
          customMessage: body.message,
        });

        subject = body.subject?.trim() || template.subject;
        html = template.html;
        text = template.text;

        const sendResult = await sendEmail({
          to: toList,
          cc: commonCc,
          bcc: commonBcc,
          subject,
          html,
          text,
          attachments: attachmentValidation.attachments,
        });

        if (!sendResult.success) {
          return NextResponse.json(
            { error: sendResult.error || "Failed to send email" },
            { status: 502 },
          );
        }

        const updated = await prisma.salesOrder.update({
          where: { id: order.id },
          data: {
            // There is no EMAIL_SENT status in the schema; we store recipients for tracking.
            emailRecipients: toList.join(", "),
          },
        });

        if (order.customerId) {
          try {
            await prisma.customerActivityLog.create({
              data: {
                customerId: order.customerId,
                type: "SALES_ORDER_EMAIL_SENT",
                title: "Sales order sent",
                description: `Sales order ${order.orderNumber} sent to ${toList.join(", ")}`,
                entityType: "SALES_ORDER",
                entityId: order.id,
              },
            });
          } catch (err) {
            console.error(
              "Failed to log customer activity for sales order email",
              err,
            );
          }
        }

        return NextResponse.json({
          success: true,
          message: "Email sent successfully",
          entityType: body.type,
          entityId: updated.id,
          to: toList,
          subject,
        });
      }

      case "PAYMENT_RECEIPT": {
        if (!body.entityId) {
          return NextResponse.json(
            { error: "entityId is required for PAYMENT_RECEIPT emails" },
            { status: 400 },
          );
        }

        const payment = await prisma.payment.findUnique({
          where: { id: body.entityId },
          include: {
            sale: {
              include: {
                customer: {
                  select: { id: true, name: true, email: true },
                },
                store: {
                  select: { name: true },
                },
              },
            },
            purchase: {
              include: {
                supplier: {
                  select: { id: true, name: true, email: true },
                },
                store: {
                  select: { name: true },
                },
              },
            },
          },
        });

        if (!payment) {
          return NextResponse.json(
            { error: "Payment not found" },
            { status: 404 },
          );
        }

        const sale = payment.sale;
        const purchase = payment.purchase;

        const partyName =
          sale?.customer?.name || purchase?.supplier?.name || null;
        const partyEmail =
          sale?.customer?.email || purchase?.supplier?.email || null;
        const storeName = sale?.store?.name || purchase?.store?.name || null;

        const explicitTo = normalizeEmails(body.to);
        const fallbackTo = normalizeEmails(partyEmail || undefined);
        toList = explicitTo.length > 0 ? explicitTo : fallbackTo;

        if (toList.length === 0) {
          return NextResponse.json(
            {
              error:
                "No recipient email is configured. Please provide at least one email address.",
            },
            { status: 400 },
          );
        }

        for (const addr of toList) {
          if (!isValidEmail(addr)) {
            return NextResponse.json(
              { error: `Invalid email address: ${addr}` },
              { status: 400 },
            );
          }
        }

        const relatedNumber =
          sale?.invoiceNumber || purchase?.orderNumber || null;

        const template = paymentReceiptEmailTemplate({
          org,
          receiptId: payment.id.slice(0, 8),
          paymentDate: payment.createdAt,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          customerOrSupplierName: partyName,
          customerOrSupplierEmail: toList[0],
          referenceNumber: payment.reference,
          relatedInvoiceOrBillNumber: relatedNumber,
          storeName: storeName,
          customMessage: body.message,
        });

        subject = body.subject?.trim() || template.subject;
        html = template.html;
        text = template.text;

        const sendResult = await sendEmail({
          to: toList,
          cc: commonCc,
          bcc: commonBcc,
          subject,
          html,
          text,
          attachments: attachmentValidation.attachments,
        });

        if (!sendResult.success) {
          return NextResponse.json(
            { error: sendResult.error || "Failed to send email" },
            { status: 502 },
          );
        }

        // Log activity on customer or supplier if available
        if (sale?.customerId) {
          try {
            await prisma.customerActivityLog.create({
              data: {
                customerId: sale.customerId,
                type: "PAYMENT_RECEIPT_EMAIL_SENT",
                title: "Payment receipt sent",
                description: `Payment receipt ${payment.id.slice(
                  0,
                  8,
                )} sent to ${toList.join(", ")}`,
                entityType: "PAYMENT",
                entityId: payment.id,
              },
            });
          } catch (err) {
            console.error(
              "Failed to log customer activity for payment receipt email",
              err,
            );
          }
        } else if (purchase?.supplierId) {
          try {
            await prisma.supplierActivityLog.create({
              data: {
                supplierId: purchase.supplierId!,
                type: "PAYMENT_RECEIPT_EMAIL_SENT",
                title: "Payment receipt sent",
                description: `Payment receipt ${payment.id.slice(
                  0,
                  8,
                )} sent to ${toList.join(", ")}`,
                entityType: "PAYMENT",
                entityId: payment.id,
              },
            });
          } catch (err) {
            console.error(
              "Failed to log supplier activity for payment receipt email",
              err,
            );
          }
        }

        return NextResponse.json({
          success: true,
          message: "Email sent successfully",
          entityType: body.type,
          entityId: payment.id,
          to: toList,
          subject,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported email type: ${body.type}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error in /api/email/send:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { baseEmailLayout, escapeHtml, type EmailTemplateResult, type OrgInfo } from "./types";

export interface PaymentReceiptEmailTemplateProps {
  org: OrgInfo | null;
  receiptId: string;
  paymentDate?: Date | string | null;
  amount: number;
  paymentMethod?: string | null;
  customerOrSupplierName?: string | null;
  customerOrSupplierEmail?: string | null;
  referenceNumber?: string | null;
  relatedInvoiceOrBillNumber?: string | null;
  storeName?: string | null;
  customMessage?: string;
}

function formatDate(value?: Date | string | null): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(safe);
}

export function paymentReceiptEmailTemplate(
  props: PaymentReceiptEmailTemplateProps,
): EmailTemplateResult {
  const {
    org,
    receiptId,
    paymentDate,
    amount,
    paymentMethod,
    customerOrSupplierName,
    customerOrSupplierEmail,
    referenceNumber,
    relatedInvoiceOrBillNumber,
    storeName,
    customMessage,
  } = props;

  const title = `Payment Receipt #${receiptId}`;

  const rows: string[] = [];
  rows.push(
    `<tr><td style="padding:4px 8px;color:#555;">Receipt No.</td><td style="padding:4px 8px;font-weight:600;">${escapeHtml(
      receiptId,
    )}</td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:4px 8px;color:#555;">Payment Date</td><td style="padding:4px 8px;">${escapeHtml(
      formatDate(paymentDate),
    )}</td></tr>`,
  );
  if (paymentMethod) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Payment Method</td><td style="padding:4px 8px;">${escapeHtml(
        paymentMethod,
      )}</td></tr>`,
    );
  }
  if (referenceNumber) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Reference</td><td style="padding:4px 8px;">${escapeHtml(
        referenceNumber,
      )}</td></tr>`,
    );
  }
  if (relatedInvoiceOrBillNumber) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Invoice / Bill No.</td><td style="padding:4px 8px;">${escapeHtml(
        relatedInvoiceOrBillNumber,
      )}</td></tr>`,
    );
  }
  if (storeName) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Store</td><td style="padding:4px 8px;">${escapeHtml(
        storeName,
      )}</td></tr>`,
    );
  }

  rows.push(
    `<tr><td style="padding:6px 8px;color:#111;font-weight:600;border-top:1px solid #eee;">Amount</td><td style="padding:6px 8px;font-weight:700;border-top:1px solid #eee;">${escapeHtml(
      formatCurrency(amount),
    )}</td></tr>`,
  );

  const summaryTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;

  const introHtml = `
    <p style="margin:0 0 8px 0;">Dear ${escapeHtml(
      customerOrSupplierName || "Customer",
    )},</p>
    <p style="margin:0 0 8px 0;">We have received your payment to ${escapeHtml(
      org?.name || storeName || "our organization",
    )}. Please find the payment receipt details below. A PDF copy of this receipt may be attached for your records.</p>
  `;

  const contentHtml = `${introHtml}${summaryTable}`;

  const customMessageHtml = customMessage
    ? `<p style="margin:12px 0 0 0;white-space:pre-line;">${escapeHtml(
        customMessage,
      )}</p>`
    : undefined;

  const html = baseEmailLayout({
    org,
    title,
    contentHtml,
    customMessageHtml,
  });

  const subject = `Payment Receipt #${receiptId} from ${
    org?.name || storeName || "your store"
  }`;

  const textLines: string[] = [];
  textLines.push(subject);
  textLines.push("");
  textLines.push(
    `Customer: ${customerOrSupplierName || "Customer"}${
      customerOrSupplierEmail ? ` <${customerOrSupplierEmail}>` : ""
    }`,
  );
  textLines.push(`Payment Date: ${formatDate(paymentDate)}`);
  textLines.push(`Amount: ${formatCurrency(amount)}`);
  if (paymentMethod) {
    textLines.push(`Payment Method: ${paymentMethod}`);
  }
  if (referenceNumber) {
    textLines.push(`Reference: ${referenceNumber}`);
  }
  if (relatedInvoiceOrBillNumber) {
    textLines.push(`Invoice / Bill No.: ${relatedInvoiceOrBillNumber}`);
  }
  if (storeName) {
    textLines.push(`Store: ${storeName}`);
  }
  if (customMessage) {
    textLines.push("", "Message:", customMessage);
  }

  const text = textLines.join("\n");

  return { subject, html, text };
}

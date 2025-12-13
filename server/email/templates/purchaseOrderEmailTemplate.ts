import { baseEmailLayout, escapeHtml, type EmailTemplateResult, type OrgInfo } from "./types";

export interface PurchaseOrderEmailTemplateProps {
  org: OrgInfo | null;
  orderNumber: string;
  orderDate?: Date | string | null;
  supplierName?: string | null;
  supplierEmail?: string | null;
  storeName?: string | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  totalAmount: number;
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

export function purchaseOrderEmailTemplate(
  props: PurchaseOrderEmailTemplateProps,
): EmailTemplateResult {
  const {
    org,
    orderNumber,
    orderDate,
    supplierName,
    supplierEmail,
    storeName,
    subtotal,
    taxAmount,
    totalAmount,
    customMessage,
  } = props;

  const title = `Purchase Order #${orderNumber}`;

  const rows: string[] = [];
  rows.push(
    `<tr><td style="padding:4px 8px;color:#555;">Purchase Order No.</td><td style="padding:4px 8px;font-weight:600;">${escapeHtml(
      orderNumber,
    )}</td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:4px 8px;color:#555;">Order Date</td><td style="padding:4px 8px;">${escapeHtml(
      formatDate(orderDate),
    )}</td></tr>`,
  );
  if (storeName) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Store</td><td style="padding:4px 8px;">${escapeHtml(
        storeName,
      )}</td></tr>`,
    );
  }
  if (supplierName) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Supplier</td><td style="padding:4px 8px;">${escapeHtml(
        supplierName,
      )}</td></tr>`,
    );
  }
  if (supplierEmail) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Supplier Email</td><td style="padding:4px 8px;">${escapeHtml(
        supplierEmail,
      )}</td></tr>`,
    );
  }

  if (typeof subtotal === "number") {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Subtotal</td><td style="padding:4px 8px;">${escapeHtml(
        formatCurrency(subtotal),
      )}</td></tr>`,
    );
  }
  if (typeof taxAmount === "number") {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Tax</td><td style="padding:4px 8px;">${escapeHtml(
        formatCurrency(taxAmount),
      )}</td></tr>`,
    );
  }
  rows.push(
    `<tr><td style="padding:6px 8px;color:#111;font-weight:600;border-top:1px solid #eee;">Total</td><td style="padding:6px 8px;font-weight:700;border-top:1px solid #eee;">${escapeHtml(
      formatCurrency(totalAmount),
    )}</td></tr>`,
  );

  const detailsTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;

  const introHtml = `
    <p style="margin:0 0 8px 0;">Dear ${escapeHtml(
      supplierName || "Supplier",
    )},</p>
    <p style="margin:0 0 8px 0;">Please find below the details of your purchase order from ${escapeHtml(
      org?.name || storeName || "our organization",
    )}. A PDF copy of the purchase order may be attached for your reference.</p>
  `;

  const contentHtml = `${introHtml}${detailsTable}`;

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

  const subject = `Purchase Order #${orderNumber} from ${
    org?.name || storeName || "your store"
  }`;

  const textLines: string[] = [];
  textLines.push(subject);
  textLines.push("");
  textLines.push(
    `Supplier: ${supplierName || "Supplier"}${
      supplierEmail ? ` <${supplierEmail}>` : ""
    }`,
  );
  textLines.push(`Order Date: ${formatDate(orderDate)}`);
  if (storeName) {
    textLines.push(`Store: ${storeName}`);
  }
  textLines.push(`Total: ${formatCurrency(totalAmount)}`);
  if (customMessage) {
    textLines.push("", "Message:", customMessage);
  }

  const text = textLines.join("\n");

  return { subject, html, text };
}

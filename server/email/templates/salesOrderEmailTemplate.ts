import { baseEmailLayout, escapeHtml, type EmailTemplateResult, type OrgInfo } from "./types";

export interface SalesOrderEmailTemplateProps {
  org: OrgInfo | null;
  orderNumber: string;
  orderDate?: Date | string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  storeName?: string | null;
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

export function salesOrderEmailTemplate(
  props: SalesOrderEmailTemplateProps,
): EmailTemplateResult {
  const {
    org,
    orderNumber,
    orderDate,
    customerName,
    customerEmail,
    storeName,
    totalAmount,
    customMessage,
  } = props;

  const title = `Sales Order #${orderNumber}`;

  const rows: string[] = [];
  rows.push(
    `<tr><td style="padding:4px 8px;color:#555;">Sales Order No.</td><td style="padding:4px 8px;font-weight:600;">${escapeHtml(
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
  if (customerName) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Customer</td><td style="padding:4px 8px;">${escapeHtml(
        customerName,
      )}</td></tr>`,
    );
  }
  if (customerEmail) {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Customer Email</td><td style="padding:4px 8px;">${escapeHtml(
        customerEmail,
      )}</td></tr>`,
    );
  }

  rows.push(
    `<tr><td style="padding:6px 8px;color:#111;font-weight:600;border-top:1px solid #eee;">Order Total</td><td style="padding:6px 8px;font-weight:700;border-top:1px solid #eee;">${escapeHtml(
      formatCurrency(totalAmount),
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
      customerName || "Customer",
    )},</p>
    <p style="margin:0 0 8px 0;">Thank you for your order with ${escapeHtml(
      org?.name || storeName || "our organization",
    )}. Your sales order details are provided below. A PDF copy may be attached for your records.</p>
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

  const subject = `Sales Order #${orderNumber} from ${
    org?.name || storeName || "your store"
  }`;

  const textLines: string[] = [];
  textLines.push(subject);
  textLines.push("");
  textLines.push(
    `Customer: ${customerName || "Customer"}${
      customerEmail ? ` <${customerEmail}>` : ""
    }`,
  );
  textLines.push(`Order Date: ${formatDate(orderDate)}`);
  if (storeName) {
    textLines.push(`Store: ${storeName}`);
  }
  textLines.push(`Order Total: ${formatCurrency(totalAmount)}`);
  if (customMessage) {
    textLines.push("", "Message:", customMessage);
  }

  const text = textLines.join("\n");

  return { subject, html, text };
}

import { baseEmailLayout, escapeHtml, type EmailTemplateResult, type OrgInfo } from "./types";

export interface InvoiceLineItemInfo {
  name?: string | null;
  quantity?: number | null;
  totalPrice?: number | null;
}

export interface InvoiceEmailTemplateProps {
  org: OrgInfo | null;
  invoiceNumber: string;
  invoiceDate?: Date | string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  storeName?: string | null;
  subtotal?: number | null;
  discount?: number | null;
  taxAmount?: number | null;
  totalAmount: number;
  dueAmount?: number | null;
  items?: InvoiceLineItemInfo[];
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

export function invoiceEmailTemplate(
  props: InvoiceEmailTemplateProps,
): EmailTemplateResult {
  const {
    org,
    invoiceNumber,
    invoiceDate,
    customerName,
    customerEmail,
    storeName,
    subtotal,
    discount,
    taxAmount,
    totalAmount,
    dueAmount,
    items,
    customMessage,
  } = props;

  const title = `Invoice #${invoiceNumber}`;

  const rows: string[] = [];
  rows.push(
    `<tr><td style="padding:4px 8px;color:#555;">Invoice No.</td><td style="padding:4px 8px;font-weight:600;">${escapeHtml(
      invoiceNumber,
    )}</td></tr>`,
  );
  rows.push(
    `<tr><td style="padding:4px 8px;color:#555;">Invoice Date</td><td style="padding:4px 8px;">${escapeHtml(
      formatDate(invoiceDate),
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

  if (typeof subtotal === "number") {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Subtotal</td><td style="padding:4px 8px;">${escapeHtml(
        formatCurrency(subtotal),
      )}</td></tr>`,
    );
  }
  if (typeof discount === "number") {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Discount</td><td style="padding:4px 8px;">${escapeHtml(
        formatCurrency(discount),
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
  if (typeof dueAmount === "number") {
    rows.push(
      `<tr><td style="padding:4px 8px;color:#555;">Amount Due</td><td style="padding:4px 8px;">${escapeHtml(
        formatCurrency(dueAmount),
      )}</td></tr>`,
    );
  }

  const summaryTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;

  let itemsTable = "";
  if (items && items.length > 0) {
    const itemRows = items
      .slice(0, 10)
      .map((item) => {
        const name = item.name || "Item";
        const qty = item.quantity ?? 0;
        const total = item.totalPrice ?? 0;
        return `<tr>
          <td style="padding:4px 8px;border-bottom:1px solid #f2f2f2;">${escapeHtml(
            name,
          )}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #f2f2f2;text-align:right;">${escapeHtml(
            String(qty),
          )}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #f2f2f2;text-align:right;">${escapeHtml(
            formatCurrency(total),
          )}</td>
        </tr>`;
      })
      .join("");

    itemsTable = `
      <h3 style="margin:16px 0 8px 0;font-size:15px;">Invoice Items</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;color:#666;">Item</th>
            <th style="text-align:right;padding:4px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;color:#666;">Qty</th>
            <th style="text-align:right;padding:4px 8px;border-bottom:1px solid #e5e5e5;font-size:12px;color:#666;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    `;
  }

  const introHtml = `
    <p style="margin:0 0 8px 0;">Dear ${escapeHtml(
      customerName || "Customer",
    )},</p>
    <p style="margin:0 0 8px 0;">Thank you for your business with ${escapeHtml(
      org?.name || storeName || "our organization",
    )}. Please find your invoice details below. A PDF copy of the invoice may be attached for your records.</p>
  `;

  const contentHtml = `${introHtml}${summaryTable}${itemsTable}`;

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

  const subject = `Invoice #${invoiceNumber} from ${
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
  textLines.push(`Invoice Date: ${formatDate(invoiceDate)}`);
  if (storeName) {
    textLines.push(`Store: ${storeName}`);
  }
  textLines.push(`Total: ${formatCurrency(totalAmount)}`);
  if (typeof dueAmount === "number") {
    textLines.push(`Amount Due: ${formatCurrency(dueAmount)}`);
  }
  if (customMessage) {
    textLines.push("", "Message:", customMessage);
  }

  const text = textLines.join("\n");

  return { subject, html, text };
}

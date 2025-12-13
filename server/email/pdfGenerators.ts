import PDFDocument from "pdfkit";
import path from "path";
import type { OrgInfo } from "./templates/types";
import type { EmailAttachment } from "./sendEmail";

function formatMoney(value: number | null | undefined): string {
  const n = typeof value === "number" ? value : 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function createPdfBuffer(build: (doc: any) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => {
      chunks.push(chunk as Buffer);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", (err) => {
      reject(err);
    });

    build(doc);
    doc.end();
  });
}

function drawOrgHeader(doc: any, org: OrgInfo | null, title: string) {
  const startY = doc.y;

  let textLeftX = 50;

  if (org?.logoUrl) {
    let logoPath: string | null = null;
    if (!org.logoUrl.startsWith("http")) {
      const relative = org.logoUrl.startsWith("/")
        ? org.logoUrl.slice(1)
        : org.logoUrl;
      logoPath = path.join(process.cwd(), "public", relative);
    }

    if (logoPath) {
      try {
        doc.image(logoPath, 50, startY, { fit: [80, 40] });
        textLeftX = 140;
      } catch {
        textLeftX = 50;
      }
    }
  }

  doc.fontSize(16).text(org?.name || "", textLeftX, startY, { continued: false });
  doc.fontSize(18).text(title, 0, startY, { align: "right" });

  doc.moveDown(0.5);

  const parts: string[] = [
    org?.addressLine1 ?? undefined,
    org?.addressLine2 ?? undefined,
    [org?.city, org?.state, org?.zipCode].filter(Boolean).join(" "),
    org?.location ?? undefined,
  ]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim());

  doc.fontSize(9);
  parts.forEach((line) => {
    doc.text(line, 50, doc.y);
  });
  if (org?.primaryContactEmail || org?.primaryContactPhone) {
    const contact: string[] = [];
    if (org.primaryContactEmail) contact.push(`Email: ${org.primaryContactEmail}`);
    if (org.primaryContactPhone) contact.push(`Phone: ${org.primaryContactPhone}`);
    doc.text(contact.join("  |  "), 50, doc.y);
  }

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();
}

export async function generatePurchaseOrderPdf(options: {
  org: OrgInfo | null;
  orderNumber: string | null;
  orderDate: Date | string | null;
  supplierName: string | null | undefined;
  storeName: string | null | undefined;
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  items?: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
}): Promise<EmailAttachment> {
  const buffer = await createPdfBuffer((doc) => {
    drawOrgHeader(doc, options.org, "Purchase Order");

    doc.fontSize(11);
    const leftX = 50;
    const midX = 320;

    // Supplier block (Bill To)
    doc.text("Supplier", leftX, doc.y, { continued: false });
    doc.moveDown(0.3);
    if (options.supplierName) {
      doc.fontSize(10).text(options.supplierName, leftX, doc.y);
    }
    if (options.storeName) {
      doc.text(`Store: ${options.storeName}`, leftX, doc.y);
    }

    // PO meta block on right
    let metaY = doc.y - 30;
    if (metaY < 90) metaY = 90;
    doc.fontSize(10).text(
      options.orderNumber ? `PO Number: ${options.orderNumber}` : "",
      midX,
      metaY,
    );
    if (options.orderDate) {
      const d = new Date(options.orderDate);
      doc.text(`PO Date: ${d.toLocaleDateString()}`, midX, doc.y);
    }

    doc.moveDown();

    const items = options.items || [];
    if (items.length > 0) {
      const startX = leftX;
      const descWidth = 230;
      const qtyWidth = 60;
      const priceWidth = 80;
      const totalWidth = 80;

      doc.moveDown(0.5);
      const headerY = doc.y;
      doc.rect(startX, headerY - 2, 545 - startX, 18).fill("#444444");
      doc.fillColor("#ffffff");
      doc.fontSize(11).text("Item", startX + 4, headerY, {
        width: descWidth,
        continued: true,
      });
      doc.text("Qty", startX + descWidth, headerY, {
        width: qtyWidth,
        align: "right",
        continued: true,
      });
      doc.text("Rate", startX + descWidth + qtyWidth, headerY, {
        width: priceWidth,
        align: "right",
        continued: true,
      });
      doc.text("Amount", startX + descWidth + qtyWidth + priceWidth, headerY, {
        width: totalWidth,
        align: "right",
      });

      doc.fillColor("#000000");
      doc.moveTo(startX, headerY + 16).lineTo(545, headerY + 16).stroke();
      doc.moveDown();

      doc.fontSize(10);
      items.forEach((item) => {
        const currentY = doc.y;
        doc.text(item.name, startX, currentY, {
          width: descWidth,
          continued: true,
        });
        doc.text(String(item.quantity), startX + descWidth, currentY, {
          width: qtyWidth,
          align: "right",
          continued: true,
        });
        doc.text(formatMoney(item.unitPrice), startX + descWidth + qtyWidth, currentY, {
          width: priceWidth,
          align: "right",
          continued: true,
        });
        doc.text(formatMoney(item.totalPrice), startX + descWidth + qtyWidth + priceWidth, currentY, {
          width: totalWidth,
          align: "right",
        });
      });
    }

    // Totals box on the right
    doc.moveDown();
    const boxX = midX;
    const boxWidth = 200;
    const startY = doc.y;
    doc.fontSize(10);
    doc.text(`Subtotal: ${formatMoney(options.subtotal)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.text(`Tax: ${formatMoney(options.taxAmount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.fontSize(11).text(`Total: ${formatMoney(options.totalAmount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    const endY = doc.y;
    doc.rect(boxX - 10, startY - 5, boxWidth + 20, endY - startY + 15).stroke();

    // Authorized Signature
    doc.moveDown(4);
    const sigX = leftX;
    const sigY = doc.y;
    doc.fontSize(10).text("Authorized Signature", sigX, sigY);
    doc.moveTo(sigX + 100, sigY + 5).lineTo(sigX + 280, sigY + 5).stroke();
  });

  return {
    filename: options.orderNumber
      ? `Purchase-Order-${options.orderNumber}.pdf`
      : "Purchase-Order.pdf",
    content: buffer,
    contentType: "application/pdf",
  };
}

export async function generateInvoicePdf(options: {
  org: OrgInfo | null;
  invoiceNumber: string | null;
  invoiceDate: Date | string | null;
  customerName: string | null | undefined;
  storeName: string | null | undefined;
  subtotal: number | null;
  discount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  dueAmount: number | null;
  items?: { name: string; quantity: number; totalPrice: number }[];
}): Promise<EmailAttachment> {
  const buffer = await createPdfBuffer((doc) => {
    drawOrgHeader(doc, options.org, "Invoice");

    doc.fontSize(11);
    const leftX = 50;
    const midX = 320;

    // Customer block (Bill To)
    doc.text("Bill To", leftX, doc.y, { continued: false });
    doc.moveDown(0.3);
    if (options.customerName) {
      doc.fontSize(10).text(options.customerName, leftX, doc.y);
    }
    if (options.storeName) {
      doc.text(`Store: ${options.storeName}`, leftX, doc.y);
    }

    // Invoice meta block on right
    let metaY = doc.y - 30;
    if (metaY < 90) metaY = 90;
    doc.fontSize(10).text(
      options.invoiceNumber ? `Invoice Number: ${options.invoiceNumber}` : "",
      midX,
      metaY,
    );
    if (options.invoiceDate) {
      const d = new Date(options.invoiceDate);
      doc.text(`Invoice Date: ${d.toLocaleDateString()}`, midX, doc.y);
    }

    doc.moveDown();

    const items = options.items || [];
    if (items.length > 0) {
      const startX = leftX;
      const nameColWidth = 300;
      const qtyColWidth = 60;
      const totalColWidth = 100;

      const headerY = doc.y;
      doc.rect(startX, headerY - 2, 545 - startX, 18).fill("#444444");
      doc.fillColor("#ffffff");
      doc.fontSize(11).text("Item", startX + 4, headerY, {
        width: nameColWidth,
        continued: true,
      });
      doc.text("Qty", startX + nameColWidth, headerY, {
        width: qtyColWidth,
        align: "right",
        continued: true,
      });
      doc.text("Total", startX + nameColWidth + qtyColWidth, headerY, {
        width: totalColWidth,
        align: "right",
      });

      doc.fillColor("#000000");
      doc.moveTo(startX, headerY + 16).lineTo(545, headerY + 16).stroke();
      doc.moveDown();

      items.forEach((item) => {
        const currentY = doc.y;
        doc.fontSize(10).text(item.name, startX, currentY, {
          width: nameColWidth,
          continued: true,
        });
        doc.text(String(item.quantity), startX + nameColWidth, currentY, {
          width: qtyColWidth,
          align: "right",
          continued: true,
        });
        doc.text(formatMoney(item.totalPrice), startX + nameColWidth + qtyColWidth, currentY, {
          width: totalColWidth,
          align: "right",
        });
      });

      doc.moveDown();
    }

    // Totals box on the right
    doc.moveDown();
    const boxX = midX;
    const boxWidth = 200;
    const startY = doc.y;
    doc.fontSize(10);
    doc.text(`Subtotal: ${formatMoney(options.subtotal)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.text(`Discount: ${formatMoney(options.discount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.text(`Tax: ${formatMoney(options.taxAmount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.fontSize(11).text(`Total: ${formatMoney(options.totalAmount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.fontSize(11).text(`Amount Due: ${formatMoney(options.dueAmount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    const endY = doc.y;
    doc.rect(boxX - 10, startY - 5, boxWidth + 20, endY - startY + 15).stroke();

    // Authorized Signature
    doc.moveDown(4);
    const sigX = leftX;
    const sigY = doc.y;
    doc.fontSize(10).text("Authorized Signature", sigX, sigY);
    doc.moveTo(sigX + 100, sigY + 5).lineTo(sigX + 280, sigY + 5).stroke();
  });

  return {
    filename: options.invoiceNumber
      ? `Invoice-${options.invoiceNumber}.pdf`
      : "Invoice.pdf",
    content: buffer,
    contentType: "application/pdf",
  };
}

export async function generateSalesOrderPdf(options: {
  org: OrgInfo | null;
  orderNumber: string | null;
  orderDate: Date | string | null;
  customerName: string | null | undefined;
  storeName: string | null | undefined;
  subtotal: number | null;
  discount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  items?: { name: string; quantity: number; rate: number; totalPrice: number }[];
}): Promise<EmailAttachment> {
  const buffer = await createPdfBuffer((doc) => {
    drawOrgHeader(doc, options.org, "Sales Order");

    doc.fontSize(11);
    const leftX = 50;
    const midX = 320;

    // Customer block (Bill To)
    doc.text("Bill To", leftX, doc.y, { continued: false });
    doc.moveDown(0.3);
    if (options.customerName) {
      doc.fontSize(10).text(options.customerName, leftX, doc.y);
    }
    if (options.storeName) {
      doc.text(`Store: ${options.storeName}`, leftX, doc.y);
    }

    // Order meta block on right
    let metaY = doc.y - 30;
    if (metaY < 90) metaY = 90;
    doc.fontSize(10).text(
      options.orderNumber ? `Order Number: ${options.orderNumber}` : "",
      midX,
      metaY,
    );
    if (options.orderDate) {
      const d = new Date(options.orderDate);
      doc.text(`Order Date: ${d.toLocaleDateString()}`, midX, doc.y);
    }

    doc.moveDown();

    const items = options.items || [];
    if (items.length > 0) {
      const startX = leftX;
      const nameColWidth = 200;
      const qtyColWidth = 60;
      const rateColWidth = 80;
      const totalColWidth = 100;

      const headerY = doc.y;
      doc.rect(startX, headerY - 2, 545 - startX, 18).fill("#444444");
      doc.fillColor("#ffffff");
      doc.fontSize(11).text("Item", startX + 4, headerY, {
        width: nameColWidth,
        continued: true,
      });
      doc.text("Qty", startX + nameColWidth, headerY, {
        width: qtyColWidth,
        align: "right",
        continued: true,
      });
      doc.text("Rate", startX + nameColWidth + qtyColWidth, headerY, {
        width: rateColWidth,
        align: "right",
        continued: true,
      });
      doc.text("Total", startX + nameColWidth + qtyColWidth + rateColWidth, headerY, {
        width: totalColWidth,
        align: "right",
      });

      doc.fillColor("#000000");
      doc.moveTo(startX, headerY + 16).lineTo(545, headerY + 16).stroke();
      doc.moveDown();

      items.forEach((item) => {
        const currentY = doc.y;
        doc.fontSize(10).text(item.name, startX, currentY, {
          width: nameColWidth,
          continued: true,
        });
        doc.text(String(item.quantity), startX + nameColWidth, currentY, {
          width: qtyColWidth,
          align: "right",
          continued: true,
        });
        doc.text(formatMoney(item.rate), startX + nameColWidth + qtyColWidth, currentY, {
          width: rateColWidth,
          align: "right",
          continued: true,
        });
        doc.text(formatMoney(item.totalPrice), startX + nameColWidth + qtyColWidth + rateColWidth, currentY, {
          width: totalColWidth,
          align: "right",
        });
      });

      doc.moveDown();
    }

    // Totals box on the right
    doc.moveDown();
    const boxX = midX;
    const boxWidth = 200;
    const startY = doc.y;
    doc.fontSize(10);
    doc.text(`Subtotal: ${formatMoney(options.subtotal)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.text(`Discount: ${formatMoney(options.discount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.text(`Tax: ${formatMoney(options.taxAmount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    doc.fontSize(11).text(`Total: ${formatMoney(options.totalAmount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    const endY = doc.y;
    doc.rect(boxX - 10, startY - 5, boxWidth + 20, endY - startY + 15).stroke();

    // Authorized Signature
    doc.moveDown(4);
    const sigX = leftX;
    const sigY = doc.y;
    doc.fontSize(10).text("Authorized Signature", sigX, sigY);
    doc.moveTo(sigX + 100, sigY + 5).lineTo(sigX + 280, sigY + 5).stroke();
  });

  return {
    filename: options.orderNumber
      ? `Sales-Order-${options.orderNumber}.pdf`
      : "Sales-Order.pdf",
    content: buffer,
    contentType: "application/pdf",
  };
}

export async function generatePaymentReceiptPdf(options: {
  org: OrgInfo | null;
  receiptId: string;
  paymentDate: Date | string;
  amount: number;
  paymentMethod: string;
  customerOrSupplierName: string | null | undefined;
  storeName: string | null | undefined;
  referenceNumber: string | null | undefined;
  relatedInvoiceOrBillNumber: string | null | undefined;
}): Promise<EmailAttachment> {
  const buffer = await createPdfBuffer((doc) => {
    drawOrgHeader(doc, options.org, "Payment Receipt");

    doc.fontSize(11);
    const leftX = 50;
    const midX = 320;

    // Party block
    doc.text("Received From", leftX, doc.y, { continued: false });
    doc.moveDown(0.3);
    if (options.customerOrSupplierName) {
      doc.fontSize(10).text(options.customerOrSupplierName, leftX, doc.y);
    }
    if (options.storeName) {
      doc.text(`Store: ${options.storeName}`, leftX, doc.y);
    }

    // Receipt meta on right
    let metaY = doc.y - 30;
    if (metaY < 90) metaY = 90;
    const d = new Date(options.paymentDate);
    doc.fontSize(10).text(`Receipt #: ${options.receiptId}`, midX, metaY);
    doc.text(`Date: ${d.toLocaleDateString()}`, midX, doc.y);
    doc.text(`Payment Method: ${options.paymentMethod}`, midX, doc.y);
    if (options.referenceNumber) {
      doc.text(`Reference: ${options.referenceNumber}`, midX, doc.y);
    }
    if (options.relatedInvoiceOrBillNumber) {
      doc.text(`Related: ${options.relatedInvoiceOrBillNumber}`, midX, doc.y);
    }

    // Amount box
    doc.moveDown();
    const boxX = midX;
    const boxWidth = 200;
    const startY = doc.y;
    doc.fontSize(11).text(`Amount Received: ${formatMoney(options.amount)}`, boxX, doc.y, {
      width: boxWidth,
      align: "right",
    });
    const endY = doc.y;
    doc.rect(boxX - 10, startY - 5, boxWidth + 20, endY - startY + 15).stroke();

    // Authorized Signature
    doc.moveDown(4);
    const sigX = leftX;
    const sigY = doc.y;
    doc.fontSize(10).text("Authorized Signature", sigX, sigY);
    doc.moveTo(sigX + 100, sigY + 5).lineTo(sigX + 280, sigY + 5).stroke();
  });

  return {
    filename: `Payment-Receipt-${options.receiptId}.pdf`,
    content: buffer,
    contentType: "application/pdf",
  };
}

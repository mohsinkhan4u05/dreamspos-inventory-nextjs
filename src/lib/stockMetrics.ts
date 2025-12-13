import { prisma } from "@/lib/prisma";

export type ItemStockSummary = {
  accountingStock: number;
  physicalStock: number;
  committedStock: number;
  toBeShipped: number;
  toBeReceived: number;
  toBeInvoiced: number;
  toBeBilled: number;
};

export type ItemStockKey = {
  productId: string;
  variantId?: string | null;
  storeId?: string | null;
};

export async function getItemStockSummary(
  key: ItemStockKey,
): Promise<ItemStockSummary> {
  const { productId, variantId = null, storeId = null } = key;

  const stocks = await prisma.stock.findMany({
    where: {
      productId,
      ...(variantId !== null ? { variantId } : {}),
      ...(storeId !== null ? { storeId } : {}),
    },
    select: {
      quantity: true,
    },
  });

  const accountingStock = stocks.reduce((sum, s) => sum + s.quantity, 0);

  const salesOrderItemsForCommitted = await prisma.salesOrderItem.findMany({
    where: {
      productId,
      ...(variantId !== null ? { variantId } : {}),
      salesOrder: {
        ...(storeId !== null ? { storeId } : {}),
        status: "CONFIRMED",
      },
    },
    select: {
      quantity: true,
      shippedQuantity: true,
      invoicedQuantity: true,
    },
  });

  const committedStock = salesOrderItemsForCommitted.reduce((sum, item) => {
    if (item.invoicedQuantity > 0) return sum;
    const remaining = item.quantity - item.shippedQuantity;
    return remaining > 0 ? sum + remaining : sum;
  }, 0);

  // To be shipped: quantities that have already been invoiced but not yet shipped.
  // This explicitly excludes pure "to be invoiced" quantities to avoid
  // double-counting and matches the Zoho-style semantics:
  // - When a sales order is only pending invoicing, only "To be Invoiced" moves.
  // - Once invoiced, the invoiced-but-unshipped quantities appear here.
  const salesOrderItemsForShipping = await prisma.salesOrderItem.findMany({
    where: {
      productId,
      ...(variantId !== null ? { variantId } : {}),
      salesOrder: {
        ...(storeId !== null ? { storeId } : {}),
        status: {
          notIn: ["CLOSED", "CANCELLED"],
        },
      },
    },
    select: {
      quantity: true,
      shippedQuantity: true,
    },
  });

  // To be shipped: quantities from open sales orders that are ordered but not yet
  // shipped, regardless of invoicing state. This matches a sales -> shipment ->
  // invoice flow, where the next action after a sales order is shipment.
  const toBeShipped = salesOrderItemsForShipping.reduce((sum, item) => {
    const remaining = item.quantity - item.shippedQuantity;
    return remaining > 0 ? sum + remaining : sum;
  }, 0);

  const salesOrderItemsForInvoicing = await prisma.salesOrderItem.findMany({
    where: {
      productId,
      ...(variantId !== null ? { variantId } : {}),
      salesOrder: {
        ...(storeId !== null ? { storeId } : {}),
        status: {
          notIn: ["CANCELLED", "CLOSED"],
        },
      },
    },
    select: {
      shippedQuantity: true,
      invoicedQuantity: true,
    },
  });

  // To be invoiced: quantities that have already been shipped but not yet
  // invoiced. This ensures that before any shipment is created, only
  // "To be Shipped" moves; after shipping, the remaining quantity moves to
  // "To be Invoiced" until the invoice is created.
  const toBeInvoiced = salesOrderItemsForInvoicing.reduce((sum, item) => {
    const remaining = item.shippedQuantity - item.invoicedQuantity;
    return remaining > 0 ? sum + remaining : sum;
  }, 0);

  // Purchase-side physical stock semantics (Zoho-style):
  // - Before any bill exists for a PO item (billedQuantity == 0), its ordered
  //   quantity is treated as "To be Billed".
  // - As soon as the PO item is billed (billedQuantity > 0), that quantity
  //   becomes "To be Received" until it is actually received via GRN.
  // - Payments against the bill do not change these counts.

  // 1) To be Received: PO items that have been billed (fully or partially)
  // but are not yet fully received.
  const purchaseOrderItemsForReceiving =
    await prisma.purchaseOrderItem.findMany({
      where: {
        productId,
        billedQuantity: {
          gt: 0,
        },
        purchaseOrder: {
          ...(storeId !== null ? { storeId } : {}),
          status: {
            in: [
              "OPEN",
              "PARTIALLY_RECEIVED",
              "PARTIALLY_BILLED",
              "RECEIVED",
              "BILLED",
            ],
          },
        },
      },
      select: {
        quantity: true,
        receivedQuantity: true,
      },
    });

  const toBeReceived = purchaseOrderItemsForReceiving.reduce((sum, item) => {
    const remaining = item.quantity - item.receivedQuantity;
    return remaining > 0 ? sum + remaining : sum;
  }, 0);

  // 2) To be Billed: PO items that are not yet billed at all
  // (billedQuantity == 0). Until a bill is created, the full ordered quantity
  // is considered "To be Billed" in the item detail view.
  const purchaseOrderItemsForBilling =
    await prisma.purchaseOrderItem.findMany({
      where: {
        productId,
        billedQuantity: 0,
        purchaseOrder: {
          ...(storeId !== null ? { storeId } : {}),
          status: {
            in: [
              "OPEN",
              "PARTIALLY_RECEIVED",
              "PARTIALLY_BILLED",
              "RECEIVED",
              "BILLED",
            ],
          },
        },
      },
      select: {
        quantity: true,
      },
    });

  const toBeBilled = purchaseOrderItemsForBilling.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);

  const physicalStock = accountingStock - committedStock;

  return {
    accountingStock,
    physicalStock,
    committedStock,
    toBeShipped,
    toBeReceived,
    toBeInvoiced,
    toBeBilled,
  };
}

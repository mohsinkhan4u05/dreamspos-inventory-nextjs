/*
  Warnings:

  - You are about to drop the column `createdAt` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `customers` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'CLOSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "salesOrderId" TEXT,
ADD COLUMN     "stockDeducted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "storeId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedShipmentDate" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "deliveryMethod" TEXT,
    "salesperson" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "terms" TEXT,
    "emailRecipients" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "packedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoicedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_orderNumber_key" ON "sales_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "sales_orders_storeId_orderDate_idx" ON "sales_orders"("storeId", "orderDate");

-- CreateIndex
CREATE INDEX "sales_orders_customerId_orderDate_idx" ON "sales_orders"("customerId", "orderDate");

-- CreateIndex
CREATE INDEX "sales_order_items_salesOrderId_idx" ON "sales_order_items"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_salesOrderId_idx" ON "sales"("salesOrderId");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

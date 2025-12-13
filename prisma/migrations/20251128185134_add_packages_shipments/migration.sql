-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('NOT_SHIPPED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('MANUAL', 'CARRIER');

-- AlterEnum
ALTER TYPE "MovementSourceType" ADD VALUE 'SHIPMENT';

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'SHIPMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SalesOrderStatus" ADD VALUE 'PACKED';
ALTER TYPE "SalesOrderStatus" ADD VALUE 'SHIPPED';

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "packageNumber" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'NOT_SHIPPED',
    "packageDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_items" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "salesOrderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "shippedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shipmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "shippingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "sendNotification" BOOLEAN NOT NULL DEFAULT false,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'SHIPPED',
    "type" "ShipmentType" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "packageItemId" TEXT NOT NULL,
    "salesOrderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packages_packageNumber_key" ON "packages"("packageNumber");

-- CreateIndex
CREATE INDEX "packages_salesOrderId_idx" ON "packages"("salesOrderId");

-- CreateIndex
CREATE INDEX "packages_storeId_packageDate_idx" ON "packages"("storeId", "packageDate");

-- CreateIndex
CREATE INDEX "package_items_packageId_idx" ON "package_items"("packageId");

-- CreateIndex
CREATE INDEX "package_items_salesOrderItemId_idx" ON "package_items"("salesOrderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_shipmentNumber_key" ON "shipments"("shipmentNumber");

-- CreateIndex
CREATE INDEX "shipments_salesOrderId_idx" ON "shipments"("salesOrderId");

-- CreateIndex
CREATE INDEX "shipments_packageId_idx" ON "shipments"("packageId");

-- CreateIndex
CREATE INDEX "shipments_storeId_shipmentDate_idx" ON "shipments"("storeId", "shipmentDate");

-- CreateIndex
CREATE INDEX "shipment_items_shipmentId_idx" ON "shipment_items"("shipmentId");

-- CreateIndex
CREATE INDEX "shipment_items_salesOrderItemId_idx" ON "shipment_items"("salesOrderItemId");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_salesOrderItemId_fkey" FOREIGN KEY ("salesOrderItemId") REFERENCES "sales_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_packageItemId_fkey" FOREIGN KEY ("packageItemId") REFERENCES "package_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_salesOrderItemId_fkey" FOREIGN KEY ("salesOrderItemId") REFERENCES "sales_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

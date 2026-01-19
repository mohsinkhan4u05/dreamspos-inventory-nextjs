-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "BatchSourceType" AS ENUM ('OPENING_STOCK', 'PURCHASE', 'MANUFACTURING', 'SALES_RETURN', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "purchase_items" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "purchase_receive_items" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "sales_order_items" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "batchId" TEXT;

-- CreateTable
CREATE TABLE "item_batches" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "manufacturingDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "unitCost" DOUBLE PRECISION NOT NULL,
    "openingQuantity" DOUBLE PRECISION NOT NULL,
    "availableQuantity" DOUBLE PRECISION NOT NULL,
    "reservedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceType" "BatchSourceType" NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_batches_productId_batchNumber_key" ON "item_batches"("productId", "batchNumber");

-- CreateIndex
CREATE INDEX "stock_movements_batchId_idx" ON "stock_movements"("batchId");

-- AddForeignKey
ALTER TABLE "item_batches" ADD CONSTRAINT "item_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "item_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "item_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "item_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "item_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receive_items" ADD CONSTRAINT "purchase_receive_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "item_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "StockAdjustmentType" AS ENUM ('QUANTITY', 'VALUE');

-- CreateEnum
CREATE TYPE "StockAdjustmentStatus" AS ENUM ('DRAFT', 'FINAL');

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "stockLayerId" TEXT;

-- CreateTable
CREATE TABLE "stock_layers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quantityUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "sourceType" "MovementSourceType",
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "adjustmentType" "StockAdjustmentType" NOT NULL,
    "quantityAdjusted" DOUBLE PRECISION NOT NULL,
    "costPerUnit" DOUBLE PRECISION,
    "oldQuantity" DOUBLE PRECISION NOT NULL,
    "newQuantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "referenceNumber" TEXT,
    "account" TEXT,
    "notes" TEXT,
    "status" "StockAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adjustmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_layers_productId_storeId_warehouseId_createdAt_idx" ON "stock_layers"("productId", "storeId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_adjustments_productId_storeId_createdAt_idx" ON "stock_adjustments"("productId", "storeId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_stockLayerId_idx" ON "stock_movements"("stockLayerId");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockLayerId_fkey" FOREIGN KEY ("stockLayerId") REFERENCES "stock_layers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

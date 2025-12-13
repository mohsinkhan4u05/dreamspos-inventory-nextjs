-- CreateEnum
CREATE TYPE "MovementSourceType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'SALES_RETURN', 'PURCHASE_RETURN', 'OTHER');

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceItemId" TEXT,
ADD COLUMN     "sourceType" "MovementSourceType",
ADD COLUMN     "totalCost" DOUBLE PRECISION,
ADD COLUMN     "unitCost" DOUBLE PRECISION,
ADD COLUMN     "warehouseId" TEXT;

-- CreateIndex
CREATE INDEX "purchases_storeId_purchaseDate_idx" ON "purchases"("storeId", "purchaseDate");

-- CreateIndex
CREATE INDEX "purchases_supplierId_purchaseDate_idx" ON "purchases"("supplierId", "purchaseDate");

-- CreateIndex
CREATE INDEX "sales_storeId_saleDate_idx" ON "sales"("storeId", "saleDate");

-- CreateIndex
CREATE INDEX "sales_customerId_saleDate_idx" ON "sales"("customerId", "saleDate");

-- CreateIndex
CREATE INDEX "stock_movements_productId_createdAt_idx" ON "stock_movements"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_storeId_warehouseId_createdAt_idx" ON "stock_movements"("storeId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_movementType_createdAt_idx" ON "stock_movements"("movementType", "createdAt");

-- CreateIndex
CREATE INDEX "stocks_productId_storeId_warehouseId_idx" ON "stocks"("productId", "storeId", "warehouseId");

-- CreateIndex
CREATE INDEX "stocks_variantId_idx" ON "stocks"("variantId");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - A unique constraint covering the columns `[productId,variantId,storeId,warehouseId]` on the table `stocks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "stocks_productId_variantId_storeId_key";

-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "warehouseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stocks_productId_variantId_storeId_warehouseId_key" ON "stocks"("productId", "variantId", "storeId", "warehouseId");

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

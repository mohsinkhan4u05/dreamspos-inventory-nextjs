/*
  Warnings:

  - You are about to drop the column `categoryId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `products` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('GOODS', 'SERVICE');

-- CreateEnum
CREATE TYPE "InventoryValuationMethod" AS ENUM ('FIFO');

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_storeId_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "categoryId",
DROP COLUMN "storeId",
ADD COLUMN     "allowOpeningStockEdit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dimensionUnit" TEXT,
ADD COLUMN     "ean" TEXT,
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "inventoryAccount" TEXT,
ADD COLUMN     "inventoryValuation" "InventoryValuationMethod" NOT NULL DEFAULT 'FIFO',
ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "itemType" "ItemType" NOT NULL DEFAULT 'GOODS',
ADD COLUMN     "length" DOUBLE PRECISION,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "mpn" TEXT,
ADD COLUMN     "openingStock" DOUBLE PRECISION,
ADD COLUMN     "openingStockRate" DOUBLE PRECISION,
ADD COLUMN     "preferredVendorId" TEXT,
ADD COLUMN     "purchasable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "purchaseAccount" TEXT,
ADD COLUMN     "purchaseDescription" TEXT,
ADD COLUMN     "returnable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "salesAccount" TEXT,
ADD COLUMN     "salesDescription" TEXT,
ADD COLUMN     "sellable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "trackInventory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unitId" TEXT,
ADD COLUMN     "upc" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION,
ADD COLUMN     "weightUnit" TEXT,
ADD COLUMN     "width" DOUBLE PRECISION,
ALTER COLUMN "sku" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_preferredVendorId_fkey" FOREIGN KEY ("preferredVendorId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

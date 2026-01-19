-- AlterTable
ALTER TABLE "purchase_receive_items" ADD COLUMN     "batchExpiryDate" TIMESTAMP(3),
ADD COLUMN     "batchMfgDate" TIMESTAMP(3),
ADD COLUMN     "batchNumber" TEXT;

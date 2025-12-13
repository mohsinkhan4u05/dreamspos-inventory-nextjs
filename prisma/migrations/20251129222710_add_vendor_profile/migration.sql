-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('BUSINESS', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "salutation" TEXT,
ADD COLUMN     "type" "SupplierType";

-- CreateTable
CREATE TABLE "supplier_addresses" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "attention" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipcode" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contact_persons" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "salutation" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "workPhone" TEXT,
    "mobile" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_contact_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_activity_logs" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_activity_logs_supplierId_createdAt_idx" ON "supplier_activity_logs"("supplierId", "createdAt");

-- AddForeignKey
ALTER TABLE "supplier_addresses" ADD CONSTRAINT "supplier_addresses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contact_persons" ADD CONSTRAINT "supplier_contact_persons_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_activity_logs" ADD CONSTRAINT "supplier_activity_logs_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

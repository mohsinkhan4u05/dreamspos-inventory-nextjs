-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('BUSINESS', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "allowPortal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "companyName" TEXT,
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
ADD COLUMN     "type" "CustomerType";

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
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

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contact_persons" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salutation" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "workPhone" TEXT,
    "mobile" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contact_persons_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contact_persons" ADD CONSTRAINT "customer_contact_persons_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

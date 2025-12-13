-- CreateEnum
CREATE TYPE "AccountingEntryType" AS ENUM ('PURCHASE_RECEIVE', 'PURCHASE_BILL', 'PURCHASE_PAYMENT');

-- CreateEnum
CREATE TYPE "AccountingAccountCode" AS ENUM ('INVENTORY', 'GRNI', 'ACCOUNTS_PAYABLE', 'CASH', 'BANK');

-- CreateEnum
CREATE TYPE "PurchaseReceiveStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AccountingEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" TEXT NOT NULL,
    "type" "AccountingEntryType" NOT NULL,
    "purchaseOrderId" TEXT,
    "purchaseReceiveId" TEXT,
    "purchaseId" TEXT,
    "paymentId" TEXT,
    "debitAccount" "AccountingAccountCode" NOT NULL,
    "creditAccount" "AccountingAccountCode" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "narration" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "AccountingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receives" (
    "id" TEXT NOT NULL,
    "receiveNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "supplierId" TEXT,
    "storeId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "PurchaseReceiveStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "receiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receive_items" (
    "id" TEXT NOT NULL,
    "purchaseReceiveId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_receive_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingEntry_storeId_date_idx" ON "AccountingEntry"("storeId", "date");

-- CreateIndex
CREATE INDEX "AccountingEntry_type_date_idx" ON "AccountingEntry"("type", "date");

-- CreateIndex
CREATE INDEX "AccountingEntry_purchaseId_idx" ON "AccountingEntry"("purchaseId");

-- CreateIndex
CREATE INDEX "AccountingEntry_purchaseReceiveId_idx" ON "AccountingEntry"("purchaseReceiveId");

-- CreateIndex
CREATE INDEX "AccountingEntry_paymentId_idx" ON "AccountingEntry"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receives_receiveNumber_key" ON "purchase_receives"("receiveNumber");

-- CreateIndex
CREATE INDEX "purchase_receives_storeId_receiveDate_idx" ON "purchase_receives"("storeId", "receiveDate");

-- CreateIndex
CREATE INDEX "purchase_receives_purchaseOrderId_receiveDate_idx" ON "purchase_receives"("purchaseOrderId", "receiveDate");

-- CreateIndex
CREATE INDEX "purchase_receive_items_purchaseReceiveId_idx" ON "purchase_receive_items"("purchaseReceiveId");

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_purchaseReceiveId_fkey" FOREIGN KEY ("purchaseReceiveId") REFERENCES "purchase_receives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receives" ADD CONSTRAINT "purchase_receives_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receives" ADD CONSTRAINT "purchase_receives_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receives" ADD CONSTRAINT "purchase_receives_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receive_items" ADD CONSTRAINT "purchase_receive_items_purchaseReceiveId_fkey" FOREIGN KEY ("purchaseReceiveId") REFERENCES "purchase_receives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receive_items" ADD CONSTRAINT "purchase_receive_items_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receive_items" ADD CONSTRAINT "purchase_receive_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

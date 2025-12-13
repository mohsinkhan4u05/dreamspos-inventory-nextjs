-- CreateTable
CREATE TABLE "customer_activity_logs" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_activity_logs_customerId_createdAt_idx" ON "customer_activity_logs"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "customer_activity_logs" ADD CONSTRAINT "customer_activity_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

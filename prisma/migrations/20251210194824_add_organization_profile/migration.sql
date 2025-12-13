-- CreateTable
CREATE TABLE "organization_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "location" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "primaryContactName" TEXT NOT NULL,
    "primaryContactEmail" TEXT NOT NULL,
    "primaryContactPhone" TEXT,
    "baseCurrency" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "communicationLang" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "dateFormat" TEXT NOT NULL,
    "companyId" TEXT,
    "logoUrl" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_profiles_pkey" PRIMARY KEY ("id")
);

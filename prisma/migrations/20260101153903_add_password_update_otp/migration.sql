-- CreateTable
CREATE TABLE "password_update_otps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_update_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_update_otps_userId_verified_idx" ON "password_update_otps"("userId", "verified");

-- CreateIndex
CREATE INDEX "password_update_otps_expiresAt_idx" ON "password_update_otps"("expiresAt");

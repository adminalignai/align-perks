-- CreateEnum
CREATE TYPE "SessionRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "EmailTokenType" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "RewardItemType" AS ENUM ('STANDARD', 'SIGNUP_GIFT');

-- CreateEnum
CREATE TYPE "PurchaseSource" AS ENUM ('MANUAL', 'POS');

-- CreateEnum
CREATE TYPE "StandOrderStatus" AS ENUM ('PENDING', 'EMAILED', 'FULFILLED', 'CANCELED');

-- CreateTable
CREATE TABLE "OwnerUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "staffPinHash" TEXT NOT NULL,
    "lastLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "ghlLocationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "ghlPointsCustomFieldId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerLocation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "prefillEmail" TEXT,
    "prefillName" TEXT,
    "prefillPhone" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedByOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "role" "SessionRole" NOT NULL,
    "staffLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "EmailTokenType" NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "ghlContactId" TEXT NOT NULL,
    "cachedPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMagicLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "defaultLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerMagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" "RewardItemType" NOT NULL DEFAULT 'STANDARD',
    "name" TEXT NOT NULL,
    "pointsRequired" INTEGER,
    "imageUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isUndeletable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseLog" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "source" "PurchaseSource" NOT NULL DEFAULT 'MANUAL',
    "amountCents" INTEGER NOT NULL,
    "pointsAdded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionIntent" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "RedemptionIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandOrder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "logoUrl" TEXT,
    "status" "StandOrderStatus" NOT NULL DEFAULT 'PENDING',
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerUser_email_key" ON "OwnerUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Location_ghlLocationId_key" ON "Location"("ghlLocationId");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");

-- CreateIndex
CREATE INDEX "OwnerLocation_locationId_idx" ON "OwnerLocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerLocation_ownerId_locationId_key" ON "OwnerLocation"("ownerId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE INDEX "Invite_locationId_idx" ON "Invite"("locationId");

-- CreateIndex
CREATE INDEX "Invite_usedAt_idx" ON "Invite"("usedAt");

-- CreateIndex
CREATE INDEX "AuthSession_ownerId_idx" ON "AuthSession"("ownerId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_token_key" ON "EmailToken"("token");

-- CreateIndex
CREATE INDEX "EmailToken_ownerId_type_idx" ON "EmailToken"("ownerId", "type");

-- CreateIndex
CREATE INDEX "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phoneE164_key" ON "Customer"("phoneE164");

-- CreateIndex
CREATE INDEX "Customer_lastName_idx" ON "Customer"("lastName");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Enrollment_locationId_idx" ON "Enrollment"("locationId");

-- CreateIndex
CREATE INDEX "Enrollment_ghlContactId_idx" ON "Enrollment"("ghlContactId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_customerId_locationId_key" ON "Enrollment"("customerId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMagicLink_token_key" ON "CustomerMagicLink"("token");

-- CreateIndex
CREATE INDEX "CustomerMagicLink_customerId_idx" ON "CustomerMagicLink"("customerId");

-- CreateIndex
CREATE INDEX "CustomerMagicLink_expiresAt_idx" ON "CustomerMagicLink"("expiresAt");

-- CreateIndex
CREATE INDEX "RewardItem_locationId_type_idx" ON "RewardItem"("locationId", "type");

-- CreateIndex
CREATE INDEX "RewardItem_locationId_isEnabled_idx" ON "RewardItem"("locationId", "isEnabled");

-- CreateIndex
CREATE INDEX "PurchaseLog_enrollmentId_idx" ON "PurchaseLog"("enrollmentId");

-- CreateIndex
CREATE INDEX "PurchaseLog_createdAt_idx" ON "PurchaseLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionIntent_token_key" ON "RedemptionIntent"("token");

-- CreateIndex
CREATE INDEX "RedemptionIntent_enrollmentId_idx" ON "RedemptionIntent"("enrollmentId");

-- CreateIndex
CREATE INDEX "RedemptionIntent_usedAt_idx" ON "RedemptionIntent"("usedAt");

-- CreateIndex
CREATE INDEX "StandOrder_locationId_idx" ON "StandOrder"("locationId");

-- CreateIndex
CREATE INDEX "StandOrder_status_idx" ON "StandOrder"("status");

-- AddForeignKey
ALTER TABLE "OwnerLocation" ADD CONSTRAINT "OwnerLocation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerLocation" ADD CONSTRAINT "OwnerLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedByOwnerId_fkey" FOREIGN KEY ("usedByOwnerId") REFERENCES "OwnerUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMagicLink" ADD CONSTRAINT "CustomerMagicLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardItem" ADD CONSTRAINT "RewardItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLog" ADD CONSTRAINT "PurchaseLog_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionIntent" ADD CONSTRAINT "RedemptionIntent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandOrder" ADD CONSTRAINT "StandOrder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "OwnerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandOrder" ADD CONSTRAINT "StandOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

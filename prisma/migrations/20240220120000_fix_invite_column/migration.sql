-- AlterTable
ALTER TABLE "Invite" DROP COLUMN IF EXISTS "usedByOwnerId";
ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "usedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Invite" DROP CONSTRAINT IF EXISTS "Invite_usedByOwnerId_fkey";
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "OwnerUser"
ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSeenDashboardIntro" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PortalUser"
ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSeenDashboardIntro" BOOLEAN NOT NULL DEFAULT false;

/*
  Repair Migration: Fix Invite Table Schema Drift
  Safely adds 'usedByUserId' and removes 'usedByOwnerId' if present.
*/

DO $$
BEGIN
    -- 1. Add 'usedByUserId' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Invite' AND column_name = 'usedByUserId') THEN
        ALTER TABLE "Invite" ADD COLUMN "usedByUserId" TEXT;
    END IF;

    -- 2. Drop the old 'usedByOwnerId' if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Invite' AND column_name = 'usedByOwnerId') THEN
        -- Drop the old constraint first to avoid errors
        ALTER TABLE "Invite" DROP CONSTRAINT IF EXISTS "Invite_usedByOwnerId_fkey";
        ALTER TABLE "Invite" DROP COLUMN "usedByOwnerId";
    END IF;

    -- 3. Ensure the new Foreign Key exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Invite_usedByUserId_fkey') THEN
        ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");

  if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Invite" ADD COLUMN IF NOT EXISTS "usedByUserId" TEXT;'
    );
    results.addedColumn = "Success";
  } catch (error) {
    results.addedColumn =
      error instanceof Error ? error.message : "Unknown error adding column";
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Invite" DROP CONSTRAINT IF EXISTS "Invite_usedByOwnerId_fkey";'
    );
    results.droppedOldConstraint = "Success";
  } catch (error) {
    results.droppedOldConstraint =
      error instanceof Error
        ? error.message
        : "Unknown error dropping old constraint";
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Invite" DROP COLUMN IF EXISTS "usedByOwnerId";'
    );
    results.droppedOldColumn = "Success";
  } catch (error) {
    results.droppedOldColumn =
      error instanceof Error
        ? error.message
        : "Unknown error dropping old column";
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Invite" ADD CONSTRAINT "Invite_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;'
    );
    results.addedConstraint = "Success";
  } catch (error) {
    results.addedConstraint =
      error instanceof Error
        ? error.message
        : "Unknown error adding constraint";
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "PortalUser" ADD COLUMN IF NOT EXISTS "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;'
    );
    results.portalUserHasCompletedOnboarding = "Success";
  } catch (error) {
    results.portalUserHasCompletedOnboarding =
      error instanceof Error
        ? error.message
        : "Unknown error adding PortalUser hasCompletedOnboarding column";
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "PortalUser" ADD COLUMN IF NOT EXISTS "hasSeenDashboardIntro" BOOLEAN NOT NULL DEFAULT false;'
    );
    results.portalUserHasSeenDashboardIntro = "Success";
  } catch (error) {
    results.portalUserHasSeenDashboardIntro =
      error instanceof Error
        ? error.message
        : "Unknown error adding PortalUser hasSeenDashboardIntro column";
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "OwnerUser" ADD COLUMN IF NOT EXISTS "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;'
    );
    results.ownerUserHasCompletedOnboarding = "Success";
  } catch (error) {
    results.ownerUserHasCompletedOnboarding =
      error instanceof Error
        ? error.message
        : "Unknown error adding OwnerUser hasCompletedOnboarding column";
  }

  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "OwnerUser" ADD COLUMN IF NOT EXISTS "hasSeenDashboardIntro" BOOLEAN NOT NULL DEFAULT false;'
    );
    results.ownerUserHasSeenDashboardIntro = "Success";
  } catch (error) {
    results.ownerUserHasSeenDashboardIntro =
      error instanceof Error
        ? error.message
        : "Unknown error adding OwnerUser hasSeenDashboardIntro column";
  }

  return NextResponse.json(results);
}

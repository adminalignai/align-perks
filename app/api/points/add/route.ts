import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import { updateContactCustomField } from "@/lib/ghl";
import prisma from "@/lib/prisma";
import { getUserLocationIds } from "@/lib/rewards";

type AddPointsPayload = {
  enrollmentId?: string;
  amount?: number;
};

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.GHL_PRIVATE_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "GHL access token not configured" }, { status: 500 });
  }

  const pointsFieldId = process.env.GHL_POINTS_FIELD_ID;
  if (!pointsFieldId) {
    return NextResponse.json({ error: "GHL points field id not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as AddPointsPayload;
  const enrollmentId = body.enrollmentId?.trim();
  const amount = typeof body.amount === "number" ? body.amount : Number.NaN;

  if (!enrollmentId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "enrollmentId and a positive amount are required" }, { status: 400 });
  }

  const pointsAdded = Math.floor(amount);
  const amountCents = Math.round(amount * 100);

  if (amountCents <= 0) {
    return NextResponse.json({ error: "Amount must be greater than $0" }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      locationId: true,
      cachedPoints: true,
      ghlContactId: true,
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  const allowedLocationIds = await getUserLocationIds(session.userId);
  if (!allowedLocationIds.includes(enrollment.locationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!enrollment.ghlContactId) {
    return NextResponse.json({ error: "Missing GHL contact id for enrollment" }, { status: 500 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.purchaseLog.create({
      data: {
        enrollmentId: enrollment.id,
        amountCents,
        pointsAdded,
      },
    });

    return tx.enrollment.update({
      where: { id: enrollment.id },
      data: { cachedPoints: { increment: pointsAdded } },
      select: { cachedPoints: true },
    });
  });

  const newTotal = updated.cachedPoints;

  try {
    await updateContactCustomField(accessToken, enrollment.ghlContactId, pointsFieldId, newTotal);
  } catch (error) {
    console.error("Failed to sync points to GHL", error);
  }

  return NextResponse.json({ success: true, newPoints: newTotal });
}

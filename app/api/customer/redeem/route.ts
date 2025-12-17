export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getCustomerSessionFromRequest } from "@/lib/customerAuth";
import prisma from "@/lib/prisma";

type RedeemBody = {
  enrollmentId?: string;
  rewardItemId?: string;
  quantity?: number;
};

export async function POST(request: NextRequest) {
  const session = await getCustomerSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as RedeemBody;
  const enrollmentId = body.enrollmentId?.trim();
  const rewardItemId = body.rewardItemId?.trim();
  const parsedQuantity = body.quantity;

  if (
    !enrollmentId ||
    !rewardItemId ||
    !Number.isInteger(parsedQuantity) ||
    (parsedQuantity ?? 0) <= 0
  ) {
    return NextResponse.json({ error: "Missing or invalid enrollmentId, rewardItemId, or quantity" }, { status: 400 });
  }

  const quantity = parsedQuantity as number;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      customerId: true,
      cachedPoints: true,
      locationId: true,
    },
  });

  if (!enrollment || enrollment.customerId !== session.customerId) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  const rewardItem = await prisma.rewardItem.findUnique({
    where: { id: rewardItemId },
    select: { id: true, name: true, locationId: true, pointsRequired: true },
  });

  if (!rewardItem || rewardItem.locationId !== enrollment.locationId) {
    return NextResponse.json({ error: "Reward not found" }, { status: 404 });
  }

  if (rewardItem.pointsRequired == null) {
    return NextResponse.json({ error: "This reward cannot be redeemed right now" }, { status: 400 });
  }

  const totalPoints = rewardItem.pointsRequired * quantity;

  if (enrollment.cachedPoints < totalPoints) {
    return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
  }

  const redemptionIntent = await prisma.redemptionIntent.create({
    data: {
      enrollmentId: enrollment.id,
      token: crypto.randomBytes(16).toString("hex"),
      items: [
        {
          rewardItemId: rewardItem.id,
          name: rewardItem.name,
          pointsEach: rewardItem.pointsRequired,
          qty: quantity,
          pointsTotal: totalPoints,
        },
      ],
      pointsSpent: totalPoints,
    },
    select: { id: true, token: true },
  });

  return NextResponse.json({
    token: redemptionIntent.token,
    redemptionIntentId: redemptionIntent.id,
  });
}

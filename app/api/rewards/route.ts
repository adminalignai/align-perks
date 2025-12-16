import { NextRequest, NextResponse } from "next/server";
import { RewardItemType } from "@prisma/client";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function ensureLocationAccess(userId: string, locationId: string) {
  const relation = await prisma.userLocation.findUnique({
    where: { userId_locationId: { userId, locationId } },
    select: { locationId: true },
  });

  return Boolean(relation);
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const hasAccess = await ensureLocationAccess(session.userId, locationId);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let rewards = await prisma.rewardItem.findMany({
    where: { locationId },
    orderBy: { createdAt: "asc" },
  });

  const signupGift = rewards.find((reward) => reward.type === RewardItemType.SIGNUP_GIFT);

  if (!signupGift) {
    await prisma.rewardItem.create({
      data: {
        locationId,
        name: "Welcome Reward",
        pointsRequired: 0,
        imageUrl: undefined,
        isUndeletable: true,
        type: RewardItemType.SIGNUP_GIFT,
      },
    });

    rewards = await prisma.rewardItem.findMany({
      where: { locationId },
      orderBy: { createdAt: "asc" },
    });
  }

  return NextResponse.json({ rewards });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    pointsRequired?: number;
    imageUrl?: string;
    locationId?: string;
  };

  if (!body.locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const hasAccess = await ensureLocationAccess(session.userId, body.locationId);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (typeof body.pointsRequired !== "number" || !Number.isInteger(body.pointsRequired)) {
    return NextResponse.json({ error: "pointsRequired must be an integer" }, { status: 400 });
  }

  const reward = await prisma.rewardItem.create({
    data: {
      name: body.name,
      pointsRequired: body.pointsRequired,
      imageUrl: body.imageUrl,
      locationId: body.locationId,
      type: RewardItemType.STANDARD,
    },
  });

  return NextResponse.json({ reward });
}

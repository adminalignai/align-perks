import { NextRequest, NextResponse } from "next/server";

import { RewardItemType } from "@prisma/client";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function authorizeReward(request: NextRequest, rewardId: string) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const reward = await prisma.rewardItem.findUnique({ where: { id: rewardId } });

  if (!reward) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const userLocation = await prisma.userLocation.findUnique({
    where: { userId_locationId: { userId: session.userId, locationId: reward.locationId } },
  });

  if (!userLocation) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { reward };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authorized = await authorizeReward(request, id);

  if ("error" in authorized) {
    return authorized.error;
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    pointsRequired?: number | null;
    imageUrl?: string | null;
    isEnabled?: boolean;
  };

  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.imageUrl === "string" || body.imageUrl === null) data.imageUrl = body.imageUrl;
  if (typeof body.isEnabled === "boolean") data.isEnabled = body.isEnabled;

  if (authorized.reward.type === RewardItemType.SIGNUP_GIFT) {
    if (body.pointsRequired === null) {
      data.pointsRequired = null;
    } else if (typeof body.pointsRequired === "number") {
      if (!Number.isInteger(body.pointsRequired) || body.pointsRequired < 0) {
        return NextResponse.json({ error: "Point value must be an integer" }, { status: 400 });
      }
      data.pointsRequired = body.pointsRequired;
    }
  } else {
    if (!Number.isInteger(body.pointsRequired ?? NaN) || (body.pointsRequired ?? 0) < 0) {
      return NextResponse.json({ error: "pointsRequired must be an integer" }, { status: 400 });
    }

    data.pointsRequired = body.pointsRequired ?? authorized.reward.pointsRequired ?? 0;
  }

  const reward = await prisma.rewardItem.update({
    where: { id },
    data,
  });

  return NextResponse.json({ reward });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authorized = await authorizeReward(request, id);

  if ("error" in authorized) {
    return authorized.error;
  }

  if (authorized.reward.type === RewardItemType.SIGNUP_GIFT || authorized.reward.isUndeletable) {
    return NextResponse.json({ error: "Cannot delete this reward" }, { status: 400 });
  }

  await prisma.rewardItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getRewardWithAccess(userId: string, rewardId: string) {
  const reward = await prisma.rewardItem.findUnique({
    where: { id: rewardId },
  });

  if (!reward) {
    return { reward: null, allowed: false } as const;
  }

  const access = await prisma.userLocation.findUnique({
    where: {
      userId_locationId: { userId, locationId: reward.locationId },
    },
    select: { locationId: true },
  });

  return { reward, allowed: Boolean(access) } as const;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reward, allowed } = await getRewardWithAccess(session.userId, params.id);

  if (!reward) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    pointsRequired?: number | null;
    imageUrl?: string | null;
    isEnabled?: boolean;
  };

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    data.name = body.name;
  }

  if (body.pointsRequired !== undefined) {
    if (body.pointsRequired !== null && !Number.isInteger(body.pointsRequired)) {
      return NextResponse.json(
        { error: "pointsRequired must be an integer" },
        { status: 400 },
      );
    }

    data.pointsRequired = body.pointsRequired;
  }

  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl;
  }

  if (body.isEnabled !== undefined) {
    data.isEnabled = body.isEnabled;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.rewardItem.update({
    where: { id: reward.id },
    data,
  });

  return NextResponse.json({ reward: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reward, allowed } = await getRewardWithAccess(session.userId, params.id);

  if (!reward) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (reward.isUndeletable) {
    return NextResponse.json(
      { error: "This reward cannot be deleted" },
      { status: 400 },
    );
  }

  await prisma.rewardItem.delete({ where: { id: reward.id } });

  return NextResponse.json({ success: true });
}

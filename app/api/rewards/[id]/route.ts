import { NextRequest, NextResponse } from "next/server";

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

  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.pointsRequired === "number" || body.pointsRequired === null)
    data.pointsRequired = body.pointsRequired;
  if (typeof body.imageUrl === "string" || body.imageUrl === null) data.imageUrl = body.imageUrl;
  if (typeof body.isEnabled === "boolean") data.isEnabled = body.isEnabled;

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

  if (authorized.reward.isUndeletable) {
    return NextResponse.json({ error: "Cannot delete this reward" }, { status: 400 });
  }

  await prisma.rewardItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

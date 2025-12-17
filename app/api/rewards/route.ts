import { NextRequest, NextResponse } from "next/server";
import { RewardItemType } from "@prisma/client";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureSignupGiftForLocation, getUserLocationIds } from "@/lib/rewards";

async function resolveLocationId(userId: string, requestedLocationId?: string | null) {
  const allowedLocationIds = await getUserLocationIds(userId);
  if (allowedLocationIds.length === 0) {
    return { error: NextResponse.json({ error: "No locations available" }, { status: 400 }) } as const;
  }

  if (requestedLocationId && !allowedLocationIds.includes(requestedLocationId)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  const targetLocationId = requestedLocationId ?? allowedLocationIds[0];
  return { locationId: targetLocationId, allowedLocationIds } as const;
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLocationId = searchParams.get("locationId");
  const resolved = await resolveLocationId(session.userId, requestedLocationId);

  if ("error" in resolved) {
    return resolved.error;
  }

  await ensureSignupGiftForLocation(resolved.locationId);

  const rewards = await prisma.rewardItem.findMany({
    where: { locationId: resolved.locationId },
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ rewards });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    locationId?: string;
    name?: string;
    pointsRequired?: number;
    type?: RewardItemType;
  };

  if (!body.locationId || typeof body.name !== "string") {
    return NextResponse.json({ error: "locationId and name are required" }, { status: 400 });
  }

  const resolved = await resolveLocationId(session.userId, body.locationId);
  if ("error" in resolved) return resolved.error;

  if (!Number.isInteger(body.pointsRequired ?? NaN) || (body.pointsRequired ?? 0) < 0) {
    return NextResponse.json({ error: "pointsRequired must be an integer" }, { status: 400 });
  }

  const reward = await prisma.rewardItem.create({
    data: {
      locationId: resolved.locationId,
      name: body.name.trim(),
      pointsRequired: body.pointsRequired ?? 0,
      type: RewardItemType.STANDARD,
    },
  });

  return NextResponse.json({ reward });
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    pointsRequired?: number | null;
    imageUrl?: string | null;
    isEnabled?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const reward = await prisma.rewardItem.findUnique({ where: { id: body.id } });
  if (!reward) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resolved = await resolveLocationId(session.userId, reward.locationId);
  if ("error" in resolved) return resolved.error;

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.imageUrl === "string" || body.imageUrl === null) data.imageUrl = body.imageUrl;
  if (typeof body.isEnabled === "boolean") data.isEnabled = body.isEnabled;

  if (reward.type === RewardItemType.SIGNUP_GIFT) {
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
    data.pointsRequired = body.pointsRequired ?? reward.pointsRequired ?? 0;
  }

  const updated = await prisma.rewardItem.update({ where: { id: reward.id }, data });
  return NextResponse.json({ reward: updated });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const reward = await prisma.rewardItem.findUnique({ where: { id: body.id } });
  if (!reward) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resolved = await resolveLocationId(session.userId, reward.locationId);
  if ("error" in resolved) return resolved.error;

  if (reward.type === RewardItemType.SIGNUP_GIFT || reward.isUndeletable) {
    return NextResponse.json({ error: "Cannot delete this reward" }, { status: 400 });
  }

  await prisma.rewardItem.delete({ where: { id: reward.id } });
  return NextResponse.json({ success: true });
}

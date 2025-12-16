import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

function generateCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId") ?? undefined;

  const userLocations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    select: { locationId: true },
  });

  const allowedLocationIds = userLocations.map((entry) => entry.locationId);

  if (locationId && !allowedLocationIds.includes(locationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.invite.findMany({
    where: {
      locationId: locationId ? locationId : { in: allowedLocationIds },
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    locationId?: string;
    expiresAt?: string;
  };

  if (!body.locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const userLocation = await prisma.userLocation.findUnique({
    where: { userId_locationId: { userId: session.userId, locationId: body.locationId } },
  });

  if (!userLocation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let code = generateCode();
  let collision = await prisma.invite.findUnique({ where: { code } });
  while (collision) {
    code = generateCode();
    collision = await prisma.invite.findUnique({ where: { code } });
  }

  const expiresAt = body.expiresAt
    ? new Date(body.expiresAt)
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const invite = await prisma.invite.create({
    data: {
      code,
      expiresAt,
      locationId: body.locationId,
    },
  });

  return NextResponse.json({ invite });
}

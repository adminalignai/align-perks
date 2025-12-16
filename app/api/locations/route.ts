import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

async function generateUniqueSlug(base: string) {
  const baseSlug = slugify(base) || "location";
  let candidate = baseSlug;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.location.findUnique({
      where: { ghlLocationId: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ locations });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };

  if (!body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = await generateUniqueSlug(body.name);

  const location = await prisma.location.create({
    data: {
      name: body.name,
      ghlLocationId: slug,
      addressLine1: body.addressLine1,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
    },
  });

  await prisma.userLocation.create({
    data: {
      userId: session.userId,
      locationId: location.id,
    },
  });

  return NextResponse.json({ location });
}

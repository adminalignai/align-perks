import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

function generateCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get("x-admin-secret");

  if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        ghlLocationId?: string;
        name?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      }
    | null;

  if (!body || !body.ghlLocationId || !body.name) {
    return NextResponse.json(
      { error: "ghlLocationId and name are required" },
      { status: 400 },
    );
  }

  const location = await prisma.location.upsert({
    where: { ghlLocationId: body.ghlLocationId },
    create: {
      ghlLocationId: body.ghlLocationId,
      name: body.name,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country,
    },
    update: {
      name: body.name,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country,
    },
  });

  let code = generateCode();
  let collision = await prisma.invite.findUnique({ where: { code } });
  while (collision) {
    code = generateCode();
    collision = await prisma.invite.findUnique({ where: { code } });
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await prisma.invite.create({
    data: {
      code,
      expiresAt,
      locationId: location.id,
    },
  });

  const inviteLink = `${request.nextUrl.origin}/invite/${code}`;

  return NextResponse.json({
    success: true,
    locationId: location.id,
    inviteCode: code,
    inviteLink,
  });
}

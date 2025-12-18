import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { valid: false, error: "Invite code is required" },
      { status: 400 },
    );
  }

  const invite = await prisma.invite.findUnique({
    where: { code },
    include: { location: { select: { name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ valid: false, error: "Invalid invite code" }, { status: 404 });
  }

  if (invite.usedAt) {
    return NextResponse.json({ valid: false, error: "Invite already used" }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, error: "Invite expired" }, { status: 400 });
  }

  return NextResponse.json({ valid: true, locationName: invite.location.name });
}

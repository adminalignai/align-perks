export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

interface UpdateBody {
  action?: "password" | "pin";
  currentPassword?: string;
  newPassword?: string;
  newPin?: string;
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as UpdateBody;

  if (!body.action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const user = await prisma.portalUser.findUnique({ where: { id: session.userId } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.action === "password") {
    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      );
    }

    const isValid = await verifyPassword(body.currentPassword, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.newPassword);

    await prisma.portalUser.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ success: true });
  }

  if (body.action === "pin") {
    if (!body.newPin || !/^\d{4}$/.test(body.newPin)) {
      return NextResponse.json(
        { error: "A 4-digit staff PIN is required" },
        { status: 400 },
      );
    }

    const userLocation = await prisma.userLocation.findFirst({
      where: { userId: session.userId },
      include: { location: { include: { owners: true } } },
      orderBy: { createdAt: "desc" },
    });

    const ownerId = userLocation?.location.owners[0]?.ownerId;

    if (!ownerId) {
      return NextResponse.json(
        { error: "No owner is associated with this account" },
        { status: 400 },
      );
    }

    const staffPinHash = await hashPassword(body.newPin);

    await prisma.$transaction([
      prisma.portalUser.update({ where: { id: user.id }, data: { staffPinHash } }),
      prisma.ownerUser.update({ where: { id: ownerId }, data: { staffPinHash } }),
    ]);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

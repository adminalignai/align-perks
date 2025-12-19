export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { clearAuthCookie, setAuthCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

interface SignupBody {
  inviteCode?: string;
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SignupBody;
  const { inviteCode, name, phone, email, password } = body;

  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const normalizedEmail = normalizeEmail(email);

  const invite = await prisma.invite.findUnique({
    where: { code: inviteCode },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  if (invite.usedAt) {
    return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  let createdUserId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const passwordHash = await hashPassword(password);

      const user = await tx.portalUser.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          phone,
        },
      });

      await tx.userLocation.create({
        data: {
          userId: user.id,
          locationId: invite.locationId,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          usedAt: new Date(),
          usedByUserId: user.id,
        },
      });

      createdUserId = user.id;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    console.error("Failed to complete signup", error);
    // EXPOSE THE REAL ERROR FOR DEBUGGING
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error during signup" },
      { status: 500 },
    );
  }

  if (!createdUserId) {
    return NextResponse.json({ error: "Unable to complete signup" }, { status: 500 });
  }

  clearAuthCookie();
  await setAuthCookie(createdUserId, 'OWNER');

  return NextResponse.json({ success: true });
}

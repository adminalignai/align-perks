export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { clearAuthCookie, setAuthCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { NextResponse } from "next/server";

interface LoginBody {
  email?: string;
  password?: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as LoginBody;
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.portalUser.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isOwner = await verifyPassword(password, user.passwordHash);
  const isStaff = user.staffPinHash ? await verifyPassword(password, user.staffPinHash) : false;

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const role = isOwner ? 'OWNER' : 'STAFF';

  clearAuthCookie();
  await setAuthCookie(user.id, role);

  return NextResponse.json({ success: true });
}

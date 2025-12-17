export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { setCustomerAuthCookie } from "@/lib/customerAuth";
import prisma from "@/lib/prisma";

interface VerifyBody {
  token?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VerifyBody;
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const magicLink = await prisma.customerMagicLink.findUnique({
    where: { token },
  });

  if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.customerMagicLink.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  await setCustomerAuthCookie(magicLink.customerId);

  return NextResponse.json({ success: true });
}

export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";

import { updateContactCustomField } from "@/lib/ghl";
import prisma from "@/lib/prisma";

interface SendMagicLinkBody {
  phone?: string;
}

function normalizePhoneNumber(phone?: string) {
  if (!phone) return null;

  const digits = phone.replace(/\D+/g, "");

  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return `+${digits}`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SendMagicLinkBody;
  const phone = body.phone?.trim();

  const phoneE164 = normalizePhoneNumber(phone);
  if (!phoneE164) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const accessToken = process.env.GHL_PRIVATE_TOKEN;
  const fieldId = process.env.GHL_SMS_BODY_FIELD_ID;

  const customer = await prisma.customer.findUnique({
    where: { phoneE164 },
    select: {
      id: true,
      enrollments: {
        select: { locationId: true, updatedAt: true, createdAt: true, ghlContactId: true },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });

  if (customer) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const defaultLocationId = customer.enrollments[0]?.locationId ?? null;
    const enrollment = customer.enrollments[0];

    await prisma.customerMagicLink.create({
      data: {
        token,
        customerId: customer.id,
        defaultLocationId,
        expiresAt,
      },
    });

    const origin = new URL(request.url).origin;
    const magicLinkUrl = `${origin}/customer/verify?token=${token}`;
    const message = `Your login link for Align Perks: ${magicLinkUrl}`;

    if (accessToken && fieldId && enrollment?.ghlContactId) {
      try {
        await updateContactCustomField(accessToken, enrollment.ghlContactId, fieldId, message);
      } catch (error) {
        console.error("Failed to update GHL SMS field for magic link", error);
      }
    } else {
      console.error("Missing GHL configuration or contact ID; skipping magic link SMS field update");
    }
  }

  return NextResponse.json({ success: true });
}

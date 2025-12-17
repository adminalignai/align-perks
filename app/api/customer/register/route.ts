export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

interface RegisterBody {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  locationId?: string;
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? null;
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
  const body = (await request.json().catch(() => ({}))) as RegisterBody;
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const phone = body.phone?.trim();
  const locationId = body.locationId?.trim();

  if (!firstName || !lastName || !phone || !locationId) {
    return NextResponse.json(
      { error: "firstName, lastName, phone, and locationId are required" },
      { status: 400 },
    );
  }

  const phoneE164 = normalizePhoneNumber(phone);

  if (!phoneE164) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true, isActive: true },
  });

  if (!location || !location.isActive) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  try {
    const { customer, signupGiftName } = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { phoneE164 },
        update: {
          firstName,
          lastName,
          email: normalizedEmail,
        },
        create: {
          phoneE164,
          firstName,
          lastName,
          email: normalizedEmail,
        },
      });

      await tx.enrollment.upsert({
        where: {
          customerId_locationId: { customerId: customer.id, locationId },
        },
        update: {},
        create: {
          customerId: customer.id,
          locationId,
          ghlContactId: customer.id,
        },
      });

      const signupGift = await tx.rewardItem.findFirst({
        where: {
          locationId,
          type: "SIGNUP_GIFT",
          isEnabled: true,
        },
        select: { name: true },
      });

      return { customer, signupGiftName: signupGift?.name ?? null };
    });

    const token = crypto.randomBytes(16).toString("hex");
    const magicLink = `https://example.com/login/verify?token=${token}`;
    const restaurantName = location.name ?? "our restaurant";

    const message = signupGiftName
      ? `Thanks for enrolling in ${restaurantName}! You've earned a free ${signupGiftName}. Redeem here: ${magicLink}`
      : `Thanks for enrolling in ${restaurantName}! View your rewards here: ${magicLink}`;

    console.log(`[SMS to ${customer.phoneE164}] ${message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to register customer", error);
    return NextResponse.json({ error: "Unable to complete registration" }, { status: 500 });
  }
}

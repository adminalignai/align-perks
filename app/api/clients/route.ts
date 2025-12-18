import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import { createContact } from "@/lib/ghl";
import prisma from "@/lib/prisma";
import { getUserLocationIds } from "@/lib/rewards";

type ClientPayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  locationId?: string;
};

function normalizePhoneNumber(phone?: string) {
  if (!phone) return null;

  const digits = phone.replace(/\D+/g, "");
  const trimmed = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (trimmed.length < 10 || trimmed.length > 15) {
    return null;
  }

  if (trimmed.length === 10) {
    return `+1${trimmed}`;
  }

  return `+${trimmed}`;
}

function normalizeEmail(email?: string | null) {
  if (!email) return null;
  return email.trim().toLowerCase();
}

function isEmailValid(email?: string | null) {
  if (!email) return false;
  const normalized = email.trim();
  return /.+@.+\..+/.test(normalized);
}

async function resolveLocationId(userId: string, requestedLocationId?: string | null) {
  const allowedLocationIds = await getUserLocationIds(userId);

  if (allowedLocationIds.length === 0) {
    return { error: NextResponse.json({ error: "No locations available" }, { status: 400 }) } as const;
  }

  if (requestedLocationId && !allowedLocationIds.includes(requestedLocationId)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  const locationId = requestedLocationId ?? allowedLocationIds[0];
  return { locationId } as const;
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedLocationId = searchParams.get("locationId");
  const resolved = await resolveLocationId(session.userId, requestedLocationId);

  if ("error" in resolved) {
    return resolved.error;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { locationId: resolved.locationId },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const clients = enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    id: enrollment.customer.id,
    firstName: enrollment.customer.firstName,
    lastName: enrollment.customer.lastName,
    phone: enrollment.customer.phoneE164,
    email: enrollment.customer.email,
  }));

  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.GHL_PRIVATE_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "GHL access token not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as ClientPayload;
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim();

  if (!firstName || !lastName || !phone || !email) {
    return NextResponse.json({ error: "firstName, lastName, phone, and email are required" }, { status: 400 });
  }

  if (!isEmailValid(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const phoneE164 = normalizePhoneNumber(phone);
  if (!phoneE164) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const resolved = await resolveLocationId(session.userId, body.locationId);
  if ("error" in resolved) {
    return resolved.error;
  }

  const normalizedEmail = normalizeEmail(email);

  const existingCustomer = await prisma.customer.findUnique({ where: { phoneE164 } });

  if (existingCustomer) {
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { customerId_locationId: { customerId: existingCustomer.id, locationId: resolved.locationId } },
    });

    if (existingEnrollment) {
      return NextResponse.json({ error: "Client is already enrolled for this location" }, { status: 400 });
    }
  }

  let ghlContactId: string;

  try {
    const response = await createContact(accessToken, resolved.locationId, {
      firstName,
      lastName,
      email: normalizedEmail,
      phone: phoneE164,
    });

    ghlContactId = response.contact.id;
  } catch (error) {
    console.error("Failed to create GHL contact", error);
    const message = error instanceof Error ? error.message : "Unable to create GHL contact";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  try {
    const { customer, enrollment } = await prisma.$transaction(async (tx) => {
      const customer = existingCustomer
        ? await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              firstName,
              lastName,
              email: normalizedEmail,
            },
          })
        : await tx.customer.create({
            data: {
              phoneE164,
              firstName,
              lastName,
              email: normalizedEmail,
            },
          });

      const enrollment = await tx.enrollment.create({
        data: {
          customerId: customer.id,
          locationId: resolved.locationId,
          ghlContactId,
        },
      });

      return { customer, enrollment };
    });

    return NextResponse.json({
      client: {
        enrollmentId: enrollment.id,
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phoneE164,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error("Failed to add client", error);
    return NextResponse.json({ error: "Unable to add client" }, { status: 500 });
  }
}

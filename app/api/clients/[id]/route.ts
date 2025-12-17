import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

type UpdatePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
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

async function authorizeEnrollment(userId: string, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { customer: true },
  });

  if (!enrollment) {
    return { error: NextResponse.json({ error: "Enrollment not found" }, { status: 404 }) } as const;
  }

  const access = await prisma.userLocation.findUnique({
    where: { userId_locationId: { userId, locationId: enrollment.locationId } },
  });

  if (!access) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { enrollment } as const;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const authorized = await authorizeEnrollment(session.userId, id);

  if ("error" in authorized) {
    return authorized.error;
  }

  const body = (await request.json().catch(() => ({}))) as UpdatePayload;
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim();

  if (!firstName && !lastName && !phone && !email) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};

  if (firstName) updates.firstName = firstName;
  if (lastName) updates.lastName = lastName;

  if (phone) {
    const phoneE164 = normalizePhoneNumber(phone);
    if (!phoneE164) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    if (phoneE164 !== authorized.enrollment.customer.phoneE164) {
      const existing = await prisma.customer.findUnique({ where: { phoneE164 } });
      if (existing && existing.id !== authorized.enrollment.customerId) {
        return NextResponse.json({ error: "Phone number already in use" }, { status: 400 });
      }

      updates.phoneE164 = phoneE164;
    }
  }

  if (email) {
    if (!isEmailValid(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    updates.email = normalizeEmail(email);
  }

  const customer = await prisma.customer.update({
    where: { id: authorized.enrollment.customerId },
    data: updates,
  });

  return NextResponse.json({
    client: {
      enrollmentId: authorized.enrollment.id,
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phoneE164,
      email: customer.email,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const authorized = await authorizeEnrollment(session.userId, id);

  if ("error" in authorized) {
    return authorized.error;
  }

  await prisma.enrollment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

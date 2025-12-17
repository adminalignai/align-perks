import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return `+${digits}`;
}

async function authorizeEnrollment(request: NextRequest, enrollmentId: string) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { customer: true },
  });

  if (!enrollment) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const userLocation = await prisma.userLocation.findUnique({
    where: {
      userId_locationId: { userId: session.userId, locationId: enrollment.locationId },
    },
    select: { id: true },
  });

  if (!userLocation) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { enrollment } as const;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authorized = await authorizeEnrollment(request, id);

  if ("error" in authorized) {
    return authorized.error;
  }

  const body = (await request.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };

  const data: Prisma.CustomerUpdateInput = {};

  if (typeof body.firstName === "string") data.firstName = body.firstName.trim();
  if (typeof body.lastName === "string") data.lastName = body.lastName.trim();
  if (typeof body.email === "string") {
    data.email = body.email.trim() ? body.email.trim() : null;
  }

  if (typeof body.phone === "string") {
    const normalized = normalizePhone(body.phone);
    if (!normalized) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    data.phoneE164 = normalized;
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id: authorized.enrollment.customerId },
    data,
  });

  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: { customer: true },
  });

  return NextResponse.json({
    enrollment: enrollment ?? { ...authorized.enrollment, customer: updatedCustomer },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authorized = await authorizeEnrollment(request, id);

  if ("error" in authorized) {
    return authorized.error;
  }

  await prisma.enrollment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

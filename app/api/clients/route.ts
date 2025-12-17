import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const query = (searchParams.get("query") ?? searchParams.get("q") ?? "").trim();

  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const userLocation = await prisma.userLocation.findUnique({
    where: { userId_locationId: { userId: session.userId, locationId } },
    select: { id: true },
  });

  if (!userLocation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      locationId,
      customer: query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phoneE164: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ enrollments });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    locationId?: string;
  };

  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  const emailInput = body.email?.trim();
  const phoneInput = body.phone?.trim();
  const locationId = body.locationId;

  if (!firstName || !lastName || !emailInput || !phoneInput || !locationId) {
    return NextResponse.json(
      { error: "firstName, lastName, email, phone, and locationId are required" },
      { status: 400 },
    );
  }

  const phoneE164 = normalizePhone(phoneInput);

  if (!phoneE164) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  const email = emailInput || null;

  const userLocation = await prisma.userLocation.findUnique({
    where: { userId_locationId: { userId: session.userId, locationId } },
    select: { id: true },
  });

  if (!userLocation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const customer = await prisma.customer.upsert({
    where: { phoneE164 },
    update: {
      firstName,
      lastName,
      email,
    },
    create: {
      phoneE164,
      firstName,
      lastName,
      email,
    },
  });

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { customerId_locationId: { customerId: customer.id, locationId } },
    include: { customer: true },
  });

  if (existingEnrollment) {
    return NextResponse.json({ enrollment: existingEnrollment });
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      customerId: customer.id,
      locationId,
      ghlContactId: `manual-${customer.id}-${locationId}`,
    },
    include: { customer: true },
  });

  return NextResponse.json({ enrollment });
}

import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface OrderPayload {
  locationId?: string;
  quantity?: number;
  totalPrice?: number;
  logoUrl?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as OrderPayload;
  const { locationId, quantity, totalPrice, logoUrl, message } = body;

  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  if (typeof quantity !== "number" || Number.isNaN(quantity) || quantity <= 0) {
    return NextResponse.json(
      { error: "Quantity must be a positive number" },
      { status: 400 },
    );
  }

  const userLocation = await prisma.userLocation.findUnique({
    where: { userId_locationId: { userId: session.userId, locationId } },
    include: { location: { include: { owners: true } } },
  });

  if (!userLocation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ownerId = userLocation.location.owners[0]?.ownerId;

  if (!ownerId) {
    return NextResponse.json(
      { error: "No owner is associated with this location" },
      { status: 400 },
    );
  }

  const order = await prisma.standOrder.create({
    data: {
      ownerId,
      locationId,
      quantity,
      message: message ?? "",
      logoUrl,
    },
  });

  const locationName = userLocation.location.name ?? "Unknown location";
  const total = typeof totalPrice === "number" ? totalPrice : quantity * 43.99;

  console.log(
    `Sending email to admin@getalign.ai: Order for ${locationName}, Qty: ${quantity}, Total: ${total}`,
  );

  return NextResponse.json({ success: true, order });
}

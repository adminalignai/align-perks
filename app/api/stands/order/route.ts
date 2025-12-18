import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import { sendStandOrderEmail } from "@/lib/email";
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
    include: { location: { include: { owners: { include: { owner: true } } } } },
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

  let order = await prisma.standOrder.create({
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
  const ownerEmail = userLocation.location.owners[0]?.owner.email ?? "Unknown owner email";

  try {
    await sendStandOrderEmail({
      restaurantName: locationName,
      quantity,
      total,
      message,
      ownerEmail,
      logoUrl,
    });

    order = await prisma.standOrder.update({
      where: { id: order.id },
      data: {
        status: "EMAILED",
        emailedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to send stand order email", error);
  }

  return NextResponse.json({ success: true, order });
}

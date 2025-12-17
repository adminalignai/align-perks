import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true, isActive: true },
  });

  if (!location || !location.isActive) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json({
    location: {
      id: location.id,
      name: location.name ?? "Our restaurant",
    },
  });
}

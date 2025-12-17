"use server";

import { cookies } from "next/headers";

import { ACTIVE_LOCATION_COOKIE } from "@/lib/activeLocation";

export async function setActiveLocation(locationId: string | null): Promise<void> {
  const cookieStore = await cookies();

  if (!locationId) {
    cookieStore.delete(ACTIVE_LOCATION_COOKIE);
    return;
  }

  cookieStore.set(ACTIVE_LOCATION_COOKIE, locationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

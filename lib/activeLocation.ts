import { cookies } from "next/headers";

export const ACTIVE_LOCATION_COOKIE = "active_location_id";

export async function getActiveLocationIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_LOCATION_COOKIE)?.value ?? null;
}

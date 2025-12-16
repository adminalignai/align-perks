export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { clearAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  clearAuthCookie();
  return NextResponse.json({ success: true });
}

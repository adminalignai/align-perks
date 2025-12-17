import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";
import StaffScanClient from "./StaffScanClient";

export default async function StaffScanPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    const token = searchParams?.token;
    const redirectTarget = token
      ? `/login?redirect=/staff/scan?token=${encodeURIComponent(token)}`
      : "/login?redirect=/staff/scan";

    redirect(redirectTarget);
  }

  const token = searchParams?.token ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 text-center">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-200">Staff Scanner</p>
          <h1 className="text-3xl font-semibold">Redeem Rewards</h1>
          <p className="text-sm text-slate-300">
            Scan the customer&apos;s QR code to verify and complete their redemption.
          </p>
        </header>

        <StaffScanClient token={token} />
      </div>
    </main>
  );
}

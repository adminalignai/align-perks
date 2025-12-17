import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";

export default async function GetStartedPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/get-started");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Get Started</p>
      <h1 className="text-3xl font-semibold text-white">Welcome to Align Perks</h1>
      <p className="text-sm text-slate-300">
        We&apos;re putting together your onboarding experience. Content for this page is coming soon.
      </p>
    </div>
  );
}

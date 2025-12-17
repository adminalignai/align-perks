import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";

export default async function ClientsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/clients");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Clients</p>
      <h1 className="text-3xl font-semibold text-white">Client management</h1>
      <p className="text-sm text-slate-300">
        The client dashboard is under construction. Check back soon for enrollment insights.
      </p>
    </div>
  );
}

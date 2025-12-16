import Link from "next/link";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getSessionFromCookies();
  const user = session
    ? await prisma.portalUser.findUnique({
        where: { id: session.userId },
        include: { locations: { include: { location: true } } },
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">
            Dashboard
          </p>
          <h1 className="text-3xl font-semibold text-white">
            {user?.name ? `${user.name}'s space` : "Owner overview"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-300">
            Manage your locations, invite your team, and keep everything aligned
            from a single luminous cockpit.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/locations"
            className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/10 transition hover:border-white/20 hover:bg-white/20"
          >
            Create a location
          </Link>
          <Link
            href="/app/invites"
            className="rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40"
          >
            Share an invite
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">
            Your identity
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {user?.name ?? "Authenticated user"}
          </h3>
          <p className="text-sm text-slate-300">{user?.email}</p>
          <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
            Session ID: {session?.userId ?? "unknown"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">
            Locations
          </p>
          <h3 className="mt-2 text-3xl font-semibold text-white">
            {user?.locations.length ?? 0}
          </h3>
          <p className="text-sm text-slate-300">
            Connected outposts in your Align Perks universe.
          </p>
          <Link
            href="/app/locations"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-200 transition hover:text-white"
          >
            Manage locations →
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">
            Quick links
          </p>
          <div className="mt-3 space-y-2 text-sm text-indigo-100">
            <Link className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 transition hover:bg-white/10" href="/app/invites">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Create invites for your team
            </Link>
            <Link className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 transition hover:bg-white/10" href="/app/locations">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              Add another location
            </Link>
            <Link className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 transition hover:bg-white/10" href="/invite/test">
              <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
              Preview public invite page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

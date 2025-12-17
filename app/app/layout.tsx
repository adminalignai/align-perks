import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getActiveLocationIdFromCookies } from "@/lib/activeLocation";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import LocationSwitcher from "./LocationSwitcher";
import LogoutButton from "./LogoutButton";

const navItems = [
  { name: "Get Started", href: "/app/get-started" },
  { name: "Reward Items", href: "/app/rewards" },
  { name: "Clients", href: "/app/clients" },
  { name: "QR Code", href: "/app/qr" },
  { name: "Settings / Account", href: "/app/settings" },
];

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app");
  }

  const user = await prisma.portalUser.findUnique({
    where: { id: session.userId },
  });

  const userLocations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: true },
    orderBy: { createdAt: "asc" },
  });

  const activeLocationId = await getActiveLocationIdFromCookies();
  const activeLocation = userLocations.find(({ location }) => location.id === activeLocationId)?.location
    ?? userLocations[0]?.location
    ?? null;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(45,212,191,0.15),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.12),transparent_26%)]"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-white/10 bg-white/5 p-6 backdrop-blur-xl lg:flex">
          <div className="mb-6">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-lg shadow-indigo-500/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-emerald-400 text-xl font-semibold text-white">
                AP
              </div>
              <div className="flex flex-col">
                <span className="text-sm uppercase tracking-[0.2em] text-indigo-200">
                  Owner Portal
                </span>
                <span className="text-lg font-semibold text-white">
                  Align Perks
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <LocationSwitcher
              locations={userLocations.map(({ location }) => location)}
              activeLocationId={activeLocation?.id ?? null}
            />
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
              >
                <span className="h-2 w-2 rounded-full bg-gradient-to-br from-indigo-400 via-blue-400 to-emerald-300 opacity-70 transition group-hover:opacity-100" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-inner shadow-indigo-500/5">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.15em] text-slate-400">
                Signed in as
              </span>
              <span className="text-base font-semibold text-white">
                {user?.name ?? "Portal User"}
              </span>
              <span className="text-slate-400">{user?.email}</span>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 px-4 pb-12 pt-8 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg shadow-indigo-500/5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 opacity-80" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">
                    Welcome back
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {user?.name ?? "Portal User"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 shadow-inner shadow-indigo-500/10">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                Secure session active
              </div>
            </header>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-2xl shadow-indigo-500/10 backdrop-blur">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

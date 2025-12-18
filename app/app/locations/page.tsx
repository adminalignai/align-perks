import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function LocationsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/locations");
  }

  const locations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Locations</p>
        <h1 className="text-3xl font-semibold text-white">Your alignments</h1>
        <p className="text-sm text-slate-300">
          Create and manage the locations linked to your owner profile.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            {locations.map(({ location, id }) => (
              <div
                key={id}
                className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                      Location
                    </p>
                    <h3 className="text-xl font-semibold text-white">
                      {location.name ?? "Untitled location"}
                    </h3>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-indigo-200">
                    Active
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-sm text-slate-300">
                  {location.addressLine1 ? (
                    <p>
                      {location.addressLine1}
                      {location.addressLine2 ? `, ${location.addressLine2}` : ""}
                    </p>
                  ) : (
                    <p className="text-slate-400">No address on file</p>
                  )}
                  {(location.city || location.state || location.postalCode) && (
                    <p>
                      {[location.city, location.state, location.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
                <p className="mt-4 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                  Internal slug: {location.ghlLocationId}
                </p>
              </div>
            ))}
            {locations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-slate-300">
                You don&apos;t have any locations yet. Reach out to us and we&apos;ll add your first location.
              </div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <circle cx="12" cy="8" r="0.5" />
              </svg>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Add a location</p>
                <h2 className="text-lg font-semibold text-white">Connect a new property</h2>
              </div>
              <p className="text-sm text-slate-300">
                To add a new location to your Align Perks account, please reach out to{" "}
                <a className="text-indigo-200 underline decoration-indigo-300/60 underline-offset-4" href="mailto:admin@getalign.ai">
                  admin@getalign.ai
                </a>
                . We will set up the HighLevel sync for you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

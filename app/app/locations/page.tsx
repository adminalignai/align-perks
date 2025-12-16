import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import LocationForm from "./LocationForm";

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
                You don&apos;t have any locations yet. Create one to get started.
              </div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
          <h2 className="text-lg font-semibold text-white">Create location</h2>
          <p className="mt-2 text-sm text-slate-300">
            Add a new outpost and it will automatically link to your account.
          </p>
          <div className="mt-4 rounded-xl bg-white/5 p-4">
            <LocationForm />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Invite, Location } from "@prisma/client";

interface Props {
  locations: Location[];
  invites: Invite[];
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default function InviteManager({ locations, invites }: Props) {
  const router = useRouter();
  const [selectedLocationId, setSelectedLocationId] = useState(
    locations[0]?.id ?? "",
  );
  const [activeInvites, setActiveInvites] = useState(invites);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveInvites(invites);
  }, [invites]);

  const filteredInvites = useMemo(
    () =>
      activeInvites.filter(
        (invite) => !selectedLocationId || invite.locationId === selectedLocationId,
      ),
    [activeInvites, selectedLocationId],
  );

  const createInvite = async () => {
    if (!selectedLocationId) {
      setError("Choose a location to generate an invite.");
      return;
    }

    setError(null);
    setCreating(true);
    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: selectedLocationId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Unable to create invite");
        return;
      }

      const data = (await response.json()) as { invite: Invite };
      setActiveInvites((current) => [data.invite, ...current]);
      router.refresh();
    } catch (err) {
      console.error("Failed to create invite", err);
      setError("Unexpected error, please try again.");
    } finally {
      setCreating(false);
    }
  };

  const inviteUrl = (code: string) => {
    if (typeof window === "undefined") {
      return `/invite/${code}`;
    }

    return `${window.location.origin}/invite/${code}`;
  };

  const copyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code));
      setError(null);
    } catch (err) {
      console.error("Failed to copy", err);
      setError("Could not copy the invite link.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">
            Location focus
          </p>
          <div className="flex flex-wrap gap-2">
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedLocationId(location.id)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selectedLocationId === location.id
                    ? "border-indigo-300 bg-indigo-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                }`}
              >
                {location.name ?? "Unnamed"}
              </button>
            ))}
            {locations.length === 0 ? (
              <span className="text-sm text-slate-400">
                No locations yet. Create one first.
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={createInvite}
            disabled={creating || locations.length === 0}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:opacity-60"
          >
            {creating ? "Generating..." : "Create invite"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-3">
        {filteredInvites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            No active invites yet. Generate one to share access.
          </div>
        ) : (
          filteredInvites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-slate-300">
                  Invite code
                </p>
                <p className="text-lg font-semibold text-white">{invite.code}</p>
                <p className="text-xs text-slate-400">
                  Expires {formatDate(invite.expiresAt)}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <div className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
                  <span className="hidden md:inline text-slate-400">{inviteUrl(invite.code)}</span>
                  <button
                    type="button"
                    onClick={() => copyInvite(invite.code)}
                    className="rounded-md border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100 transition hover:border-white/20 hover:bg-white/20"
                  >
                    Copy link
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

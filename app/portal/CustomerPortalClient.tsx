"use client";

import { useMemo, useState } from "react";

type RewardItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  pointsRequired: number | null;
};

type Enrollment = {
  id: string;
  locationId: string;
  locationName: string;
  cachedPoints: number;
  rewardItems: RewardItem[];
};

interface CustomerPortalClientProps {
  enrollments: Enrollment[];
  defaultLocationId: string | null;
}

function RewardCard({ item }: { item: RewardItem }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-indigo-500/10">
      <div className="relative h-36 w-full overflow-hidden bg-slate-900">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
            No image available
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.15em] text-indigo-200">Reward</p>
          <h3 className="text-lg font-semibold text-white">{item.name}</h3>
          {item.pointsRequired ? (
            <p className="text-sm text-slate-300">{item.pointsRequired} points</p>
          ) : (
            <p className="text-sm text-slate-300">Special reward</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => alert("Coming soon")}
          className="mt-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:shadow-indigo-400/40"
        >
          Redeem
        </button>
      </div>
    </div>
  );
}

export default function CustomerPortalClient({
  enrollments,
  defaultLocationId,
}: CustomerPortalClientProps) {
  const initialLocationId = useMemo(
    () => defaultLocationId ?? enrollments[0]?.locationId ?? null,
    [defaultLocationId, enrollments],
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initialLocationId);

  const activeEnrollment = useMemo(() => {
    if (!selectedLocationId) return enrollments[0];
    return enrollments.find((enrollment) => enrollment.locationId === selectedLocationId) ?? enrollments[0];
  }, [enrollments, selectedLocationId]);

  if (!activeEnrollment) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-blue-500/10 to-emerald-400/10 px-5 py-4 text-center shadow-inner shadow-indigo-500/10 sm:flex-row sm:text-left">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Points</p>
          <p className="text-3xl font-semibold text-white">{activeEnrollment.cachedPoints}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
          {enrollments.map((enrollment) => (
            <button
              key={enrollment.id}
              type="button"
              onClick={() => setSelectedLocationId(enrollment.locationId)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                enrollment.locationId === activeEnrollment.locationId
                  ? "border-indigo-300 bg-white/10 text-white shadow-md shadow-indigo-500/20"
                  : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
              }`}
            >
              {enrollment.locationName}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">
              Rewards at
            </p>
            <h2 className="text-xl font-semibold text-white">{activeEnrollment.locationName}</h2>
          </div>
        </div>

        {activeEnrollment.rewardItems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
            No rewards are available for this location yet. Check back soon!
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeEnrollment.rewardItems.map((item) => (
              <RewardCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

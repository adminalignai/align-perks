"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Location, RewardItem } from "@prisma/client";
import { RewardItemType } from "@prisma/client";

interface Props {
  locations: Location[];
  initialRewards: RewardItem[];
}

type SortOrder = "asc" | "desc";

export default function RewardsManager({ locations, initialRewards }: Props) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    locations[0]?.id ?? "",
  );
  const [rewards, setRewards] = useState<RewardItem[]>(initialRewards);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState("");
  const [newRewardImage, setNewRewardImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dirtyRewards, setDirtyRewards] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const hasHandledInitial = useRef(false);

  useEffect(() => {
    setSelectedLocationId(locations[0]?.id ?? "");
  }, [locations]);

  useEffect(() => {
    const fetchRewards = async () => {
      if (!selectedLocationId) {
        setRewards([]);
        return;
      }

      if (!hasHandledInitial.current && selectedLocationId === locations[0]?.id) {
        hasHandledInitial.current = true;
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/rewards?locationId=${selectedLocationId}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error ?? "Failed to load rewards.");
          setRewards([]);
          return;
        }

        const data = (await response.json()) as { rewards?: RewardItem[] };
        setRewards(data.rewards ?? []);
        setDirtyRewards(new Set());
      } catch (err) {
        console.error("Failed to fetch rewards", err);
        setError("Unexpected error loading rewards.");
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, [locations, selectedLocationId]);

  const signupReward = useMemo(
    () => rewards.find((reward) => reward.type === RewardItemType.SIGNUP_GIFT),
    [rewards],
  );

  const standardRewards = useMemo(() => {
    const list = rewards.filter((reward) => reward.type === RewardItemType.STANDARD);
    return [...list].sort((a, b) => {
      const aPoints = a.pointsRequired ?? 0;
      const bPoints = b.pointsRequired ?? 0;
      return sortOrder === "asc" ? aPoints - bPoints : bPoints - aPoints;
    });
  }, [rewards, sortOrder]);

  const toggleSort = () => {
    setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
  };

  const markDirty = (id: string) => {
    setDirtyRewards((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  const updateRewardField = (
    id: string,
    field: keyof Pick<RewardItem, "name" | "pointsRequired" | "imageUrl" | "isEnabled">,
    value: string | number | boolean | null,
  ) => {
    setRewards((current) =>
      current.map((reward) =>
        reward.id === id
          ? {
              ...reward,
              [field]: value,
            }
          : reward,
      ),
    );
    markDirty(id);
  };

  const resetNewRewardForm = () => {
    setNewRewardName("");
    setNewRewardPoints("");
    setNewRewardImage("");
  };

  const addReward = async () => {
    if (!selectedLocationId) {
      setError("Select a location to add rewards.");
      return;
    }

    if (!newRewardName.trim()) {
      setError("Reward name is required.");
      return;
    }

    const parsedPoints = Number.parseInt(newRewardPoints, 10);

    if (Number.isNaN(parsedPoints)) {
      setError("Point value must be an integer.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRewardName.trim(),
          pointsRequired: parsedPoints,
          imageUrl: newRewardImage.trim() || undefined,
          locationId: selectedLocationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Failed to create reward.");
        return;
      }

      const data = (await response.json()) as { reward: RewardItem };
      setRewards((current) => [...current, data.reward]);
      resetNewRewardForm();
      setDirtyRewards(new Set());
    } catch (err) {
      console.error("Failed to create reward", err);
      setError("Unexpected error while creating reward.");
    } finally {
      setLoading(false);
    }
  };

  const saveReward = async (rewardId: string) => {
    const reward = rewards.find((item) => item.id === rewardId);

    if (!reward) {
      return;
    }

    if (reward.type === RewardItemType.STANDARD) {
      if (typeof reward.pointsRequired !== "number" || !Number.isInteger(reward.pointsRequired)) {
        setError("Point value must be an integer.");
        return;
      }
    }

    setSavingId(rewardId);
    setError(null);

    try {
      const response = await fetch(`/api/rewards/${rewardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reward.name,
          pointsRequired: reward.pointsRequired ?? null,
          imageUrl: reward.imageUrl ?? null,
          isEnabled: reward.isEnabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Failed to save changes.");
        return;
      }

      const data = (await response.json()) as { reward: RewardItem };
      setRewards((current) => current.map((item) => (item.id === rewardId ? data.reward : item)));
      setDirtyRewards((current) => {
        const next = new Set(current);
        next.delete(rewardId);
        return next;
      });
    } catch (err) {
      console.error("Failed to save reward", err);
      setError("Unexpected error while saving reward.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteReward = async (rewardId: string) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) {
      return;
    }

    setDeletingId(rewardId);
    setError(null);

    try {
      const response = await fetch(`/api/rewards/${rewardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Failed to delete reward.");
        return;
      }

      setRewards((current) => current.filter((reward) => reward.id !== rewardId));
      setDirtyRewards((current) => {
        const next = new Set(current);
        next.delete(rewardId);
        return next;
      });
    } catch (err) {
      console.error("Failed to delete reward", err);
      setError("Unexpected error while deleting reward.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Location focus</p>
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
      </div>

      <div className="sticky top-0 z-10 space-y-3 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-indigo-500/10 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">Add reward</p>
            <h3 className="text-lg font-semibold text-white">Create a new reward item</h3>
          </div>
          <button
            type="button"
            onClick={addReward}
            disabled={loading || !selectedLocationId}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:opacity-60"
          >
            Save
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Reward Item</label>
            <input
              type="text"
              value={newRewardName}
              onChange={(event) => setNewRewardName(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
              placeholder="e.g. Free Coffee"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Point Value</label>
            <input
              type="number"
              inputMode="numeric"
              step={1}
              value={newRewardPoints}
              onChange={(event) => setNewRewardPoints(event.target.value.replace(/[^0-9-]/g, ""))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Image URL</label>
            <input
              type="text"
              value={newRewardImage}
              onChange={(event) => setNewRewardImage(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {signupReward ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent p-4 shadow-lg shadow-indigo-500/10">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">Sign-Up Gift</p>
              <h3 className="text-lg font-semibold text-white">Special enrollment reward</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.15em] text-slate-300">Status</span>
              <button
                type="button"
                onClick={() =>
                  updateRewardField(signupReward.id, "isEnabled", !signupReward.isEnabled)
                }
                className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                  signupReward.isEnabled
                    ? "border-emerald-300 bg-emerald-500/30"
                    : "border-white/10 bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    signupReward.isEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
              {dirtyRewards.has(signupReward.id) ? (
                <button
                  type="button"
                  onClick={() => saveReward(signupReward.id)}
                  disabled={savingId === signupReward.id}
                  className="rounded-lg border border-indigo-300/60 bg-indigo-500/30 px-3 py-1 text-xs font-semibold text-white shadow-inner shadow-indigo-500/20 transition hover:bg-indigo-500/40 disabled:opacity-70"
                >
                  {savingId === signupReward.id ? "Saving..." : "Save"}
                </button>
              ) : null}
            </div>
          </div>

          {!signupReward.isEnabled ? (
            <p className="font-semibold text-amber-200">
              We highly recommend that you leave this on, as an incentive for your customers to enroll in the program!
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Reward Item</label>
              <input
                type="text"
                value={signupReward.name}
                onChange={(event) =>
                  updateRewardField(signupReward.id, "name", event.target.value)
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Point Value</label>
              <input
                type="number"
                inputMode="numeric"
                step={1}
                value={signupReward.pointsRequired ?? ""}
                onChange={(event) =>
                  updateRewardField(
                    signupReward.id,
                    "pointsRequired",
                    event.target.value === ""
                      ? null
                      : Number.parseInt(event.target.value, 10),
                  )
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Image URL</label>
              <input
                type="text"
                value={signupReward.imageUrl ?? ""}
                onChange={(event) =>
                  updateRewardField(signupReward.id, "imageUrl", event.target.value)
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">Rewards list</p>
          <h3 className="text-xl font-semibold text-white">Standard rewards</h3>
        </div>
        <button
          type="button"
          onClick={toggleSort}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
        >
          Sort by points
          <span className={`transition ${sortOrder === "desc" ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            Loading rewards...
          </div>
        ) : null}

        {!loading && standardRewards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-300">
            No rewards yet. Add one to get started.
          </div>
        ) : null}

        {standardRewards.map((reward, index) => (
          <div
            key={reward.id}
            className={`space-y-3 rounded-2xl border border-white/10 px-4 py-3 transition hover:bg-white/10 md:px-5 ${
              index % 2 === 0 ? "bg-white/5" : "bg-transparent"
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3 md:items-center">
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Reward Item</label>
                  <input
                    type="text"
                    value={reward.name}
                    onChange={(event) => updateRewardField(reward.id, "name", event.target.value)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Point Value</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    step={1}
                    value={reward.pointsRequired ?? ""}
                    onChange={(event) =>
                      updateRewardField(
                        reward.id,
                        "pointsRequired",
                        event.target.value === ""
                          ? null
                          : Number.parseInt(event.target.value, 10),
                      )
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Image URL</label>
                  <input
                    type="text"
                    value={reward.imageUrl ?? ""}
                    onChange={(event) => updateRewardField(reward.id, "imageUrl", event.target.value)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-300 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 self-start md:self-center">
                {dirtyRewards.has(reward.id) ? (
                  <button
                    type="button"
                    onClick={() => saveReward(reward.id)}
                    disabled={savingId === reward.id}
                    className="rounded-lg border border-indigo-300/60 bg-indigo-500/30 px-3 py-2 text-xs font-semibold text-white shadow-inner shadow-indigo-500/20 transition hover:bg-indigo-500/40 disabled:opacity-70"
                  >
                    {savingId === reward.id ? "Saving..." : "Save"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => deleteReward(reward.id)}
                  disabled={deletingId === reward.id}
                  className="rounded-lg border border-rose-300/50 bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-50 shadow-inner shadow-rose-500/20 transition hover:bg-rose-500/30 disabled:opacity-70"
                >
                  {deletingId === reward.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

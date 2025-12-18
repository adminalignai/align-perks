"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RewardItem } from "@prisma/client";

interface RewardManagerProps {
  locationId: string;
  locationName?: string | null;
  rewards: RewardItem[];
  isStaff?: boolean;
}

type Draft = {
  name: string;
  points: string;
  isEnabled?: boolean;
};

function parsePoints(value: string, { allowEmpty }: { allowEmpty?: boolean } = {}) {
  const trimmed = value.trim();
  if (trimmed === "" && allowEmpty) {
    return { parsed: null, valid: true } as const;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { parsed: null, valid: false } as const;
  }

  return { parsed, valid: true } as const;
}

export default function RewardManager({ locationId, locationName, rewards, isStaff = false }: RewardManagerProps) {
  const router = useRouter();

  const [items, setItems] = useState<RewardItem[]>(rewards);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [addName, setAddName] = useState("");
  const [addPoints, setAddPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();
  const canManageRewards = !isStaff;

  const signupReward = useMemo(
    () => items.find((item) => item.type === "SIGNUP_GIFT") ?? null,
    [items],
  );

  const standardRewards = useMemo(
    () => items.filter((item) => item.type === "STANDARD"),
    [items],
  );

  const [signupDraft, setSignupDraft] = useState<Draft>(() => ({
    name: signupReward?.name ?? "Sign-up gift",
    points: signupReward?.pointsRequired?.toString() ?? "",
    isEnabled: signupReward?.isEnabled ?? true,
  }));

  const [standardDrafts, setStandardDrafts] = useState<Record<string, Draft>>(() => {
    return standardRewards.reduce<Record<string, Draft>>((draftMap, reward) => {
      draftMap[reward.id] = {
        name: reward.name,
        points: reward.pointsRequired?.toString() ?? "",
      };
      return draftMap;
    }, {});
  });

  useEffect(() => {
    setItems(rewards);
  }, [rewards]);

  useEffect(() => {
    if (signupReward) {
      setSignupDraft({
        name: signupReward.name,
        points: signupReward.pointsRequired?.toString() ?? "",
        isEnabled: signupReward.isEnabled,
      });
    }

    setStandardDrafts(
      standardRewards.reduce<Record<string, Draft>>((draftMap, reward) => {
        draftMap[reward.id] = {
          name: reward.name,
          points: reward.pointsRequired?.toString() ?? "",
        };
        return draftMap;
      }, {}),
    );
  }, [signupReward, standardRewards]);

  const sortedStandardRewards = useMemo(() => {
    const sorted = [...standardRewards].sort((a, b) => {
      const first = a.pointsRequired ?? 0;
      const second = b.pointsRequired ?? 0;
      return first - second;
    });

    if (sortDirection === "desc") {
      sorted.reverse();
    }

    return sorted;
  }, [standardRewards, sortDirection]);

  const rows = useMemo(() => {
    const visible: RewardItem[] = [];
    if (signupReward) visible.push(signupReward);
    return visible.concat(sortedStandardRewards);
  }, [signupReward, sortedStandardRewards]);

  const addValid = useMemo(() => {
    const { valid } = parsePoints(addPoints);
    return addName.trim().length > 0 && valid;
  }, [addName, addPoints]);

  const handleAddReward = () => {
    if (!canManageRewards) return;

    const { parsed, valid } = parsePoints(addPoints);
    if (!valid || parsed == null) return;

    startAddTransition(async () => {
      setError(null);
      setStatus(null);
      try {
        const response = await fetch("/api/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId,
            name: addName.trim(),
            pointsRequired: parsed,
          }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          reward?: RewardItem;
          error?: string;
        };

        if (!response.ok || !data.reward) {
          setError(data.error ?? "Unable to create reward item.");
          return;
        }

        setItems((current) => [...current, data.reward!]);
        setStandardDrafts((current) => ({
          ...current,
          [data.reward!.id]: {
            name: data.reward!.name,
            points: data.reward!.pointsRequired?.toString() ?? "",
          },
        }));
        setAddName("");
        setAddPoints("");
        setStatus("Reward item saved");
        router.refresh();
      } catch (err) {
        console.error(err);
        setError("Unexpected error while creating reward.");
      }
    });
  };

  const handleDelete = async (reward: RewardItem) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    setDeletingId(reward.id);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch("/api/rewards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reward.id }),
      });

      const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        setError(data.error ?? "Unable to delete reward item.");
        return;
      }

      setItems((current) => current.filter((item) => item.id !== reward.id));
      setStatus("Reward item deleted");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Unexpected error while deleting reward.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async (reward: RewardItem, draft: Draft, options?: { treatEmptyAsNull?: boolean }) => {
    const allowEmpty = options?.treatEmptyAsNull ?? false;
    const { parsed, valid } = parsePoints(draft.points, { allowEmpty });
    if (!valid) {
      setError("Point value must be a whole number.");
      return;
    }

    setSavingId(reward.id);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reward.id,
          name: draft.name.trim(),
          pointsRequired: draft.points.trim() === "" ? null : parsed,
          isEnabled: typeof draft.isEnabled === "boolean" ? draft.isEnabled : undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { reward?: RewardItem; error?: string };

      if (!response.ok || !data.reward) {
        setError(data.error ?? "Unable to save changes.");
        return;
      }

      setItems((current) => current.map((item) => (item.id === reward.id ? data.reward! : item)));

      if (reward.type === "SIGNUP_GIFT") {
        setSignupDraft({
          name: data.reward.name,
          points: data.reward.pointsRequired?.toString() ?? "",
          isEnabled: data.reward.isEnabled,
        });
      } else {
        setStandardDrafts((current) => ({
          ...current,
          [reward.id]: {
            name: data.reward!.name,
            points: data.reward!.pointsRequired?.toString() ?? "",
          },
        }));
      }

      setStatus("Changes saved");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Unexpected error while saving changes.");
    } finally {
      setSavingId(null);
    }
  };

  const isSignupDirty = signupReward
    ? signupDraft.name.trim() !== signupReward.name.trim() ||
      (signupDraft.points.trim() === ""
        ? signupReward.pointsRequired !== null
        : signupReward.pointsRequired !== parsePoints(signupDraft.points).parsed) ||
      signupDraft.isEnabled !== signupReward.isEnabled
    : false;

  const renderSignupRow = (reward: RewardItem, index: number) => {
    const background = index % 2 === 0 ? "bg-white/5" : "bg-transparent";

    return (
      <div
        key={reward.id}
        className={`flex flex-col gap-3 border-b border-white/5 p-4 transition hover:bg-white/5 ${background}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Sign-up gift</p>
            <h3 className="text-lg font-semibold text-white">The customer will receive this gift for enrolling in the rewards program.</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">{signupDraft.isEnabled ? "On" : "Off"}</span>
            <button
              type="button"
              onClick={() => setSignupDraft((draft) => ({ ...draft, isEnabled: !draft.isEnabled }))}
              disabled={isStaff}
              className={`flex h-7 w-12 items-center rounded-full border border-white/10 p-1 transition ${
                signupDraft.isEnabled ? "bg-emerald-500/70" : "bg-white/10"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow transition ${
                  signupDraft.isEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {!signupDraft.isEnabled ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100">
            We highly recommend that you leave this on, as an incentive for your customers to enroll in the program!
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3 md:items-end">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Reward Item</label>
            <input
              type="text"
              value={signupDraft.name}
              onChange={(event) => setSignupDraft((draft) => ({ ...draft, name: event.target.value }))}
              disabled={isStaff}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Point Value</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={signupDraft.points}
                onChange={(event) => setSignupDraft((draft) => ({ ...draft, points: event.target.value }))}
                disabled={isStaff}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
              />
              <span className="whitespace-nowrap text-xs text-slate-300">
                Valued at {signupDraft.points.trim() === "" ? 0 : parsePoints(signupDraft.points, { allowEmpty: true }).parsed ?? 0} points
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Image</label>
            {!isStaff ? (
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) console.log("Selected new image for sign-up gift", file.name);
                }}
                className="w-full rounded-lg border border-dashed border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 md:w-auto"
              />
            ) : null}
          </div>
        </div>

        {isSignupDirty && !isStaff ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleSave(reward, signupDraft, { treatEmptyAsNull: true })}
              disabled={savingId === reward.id}
              className="rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:shadow-indigo-400/40 disabled:opacity-60"
            >
              {savingId === reward.id ? "Saving..." : "Save"}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const renderStandardRow = (reward: RewardItem, index: number) => {
    const draft = standardDrafts[reward.id] ?? { name: reward.name, points: reward.pointsRequired?.toString() ?? "" };
    const background = index % 2 === 0 ? "bg-white/5" : "bg-transparent";
    const pointsCheck = parsePoints(draft.points);
    const isDirty =
      draft.name.trim() !== reward.name.trim() ||
      reward.pointsRequired !== pointsCheck.parsed;

    return (
      <div
        key={reward.id}
        className={`flex flex-col gap-3 border-b border-white/5 p-4 transition hover:bg-white/5 ${background}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">Reward Item</p>
            <h3 className="text-lg font-semibold text-white">Standard reward</h3>
          </div>
          {!isStaff ? (
            <button
              type="button"
              onClick={() => handleDelete(reward)}
              disabled={deletingId === reward.id}
              className="self-start rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
            >
              {deletingId === reward.id ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3 md:items-end">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Reward Item</label>
            <input
              type="text"
              value={draft.name}
              onChange={(event) =>
                setStandardDrafts((current) => ({
                  ...current,
                  [reward.id]: { ...draft, name: event.target.value },
                }))
              }
              disabled={isStaff}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Point Value</label>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={draft.points}
              onChange={(event) =>
                setStandardDrafts((current) => ({
                  ...current,
                  [reward.id]: { ...draft, points: event.target.value },
                }))
              }
              disabled={isStaff}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Image</label>
            {!isStaff ? (
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) console.log("Selected new image for", reward.name, file.name);
                }}
                className="w-full rounded-lg border border-dashed border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 md:w-auto"
              />
            ) : null}
          </div>
        </div>

        {isDirty && !isStaff ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleSave(reward, draft)}
              disabled={savingId === reward.id || !pointsCheck.valid}
              className="rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:shadow-indigo-400/40 disabled:opacity-60"
            >
              {savingId === reward.id ? "Saving..." : "Save"}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {canManageRewards && (
        <section className="sticky top-0 z-10 space-y-3 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10 backdrop-blur">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Add reward item</p>
            <p className="text-lg font-semibold text-white">{locationName ?? "Current location"}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Reward Item</label>
              <input
                type="text"
                value={addName}
                onChange={(event) => setAddName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                placeholder="Free coffee"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Point Value</label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={addPoints}
                onChange={(event) => setAddPoints(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                placeholder="25"
              />
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <label className="text-xs uppercase tracking-[0.15em] text-slate-300">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) console.log("Selected file for new reward", file.name);
                }}
                className="w-full rounded-lg border border-dashed border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 md:w-auto"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddReward}
              disabled={!addValid || isAdding}
              className="rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:opacity-60"
            >
              {isAdding ? "Saving..." : "Save"}
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">Existing reward items</p>
            <h2 className="text-xl font-semibold text-white">Rewards for this location</h2>
          </div>
          <button
            type="button"
            onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/20"
          >
            <svg
              className={`h-4 w-4 transition ${sortDirection === "desc" ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path d="M10 16L4 6h12L10 16z" />
            </svg>
            {sortDirection === "asc" ? "Ascending" : "Descending"}
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-inner shadow-indigo-500/10">
          {rows.length === 0 ? (
            <div className="p-4 text-sm text-slate-300">No rewards yet. Add your first reward above.</div>
          ) : (
            rows.map((reward, index) =>
              reward.type === "SIGNUP_GIFT"
                ? renderSignupRow(reward, index)
                : renderStandardRow(reward, index),
            )
          )}
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {status ? <p className="text-sm text-emerald-200">{status}</p> : null}
      </section>
    </div>
  );
}

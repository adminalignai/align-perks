"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

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

function RewardCard({ item, onRedeem }: { item: RewardItem; onRedeem: (item: RewardItem) => void }) {
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
          onClick={() => onRedeem(item)}
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
  const [redeemingItem, setRedeemingItem] = useState<{ enrollment: Enrollment; reward: RewardItem } | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [redemptionQr, setRedemptionQr] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeEnrollment = useMemo(() => {
    if (!selectedLocationId) return enrollments[0];
    return enrollments.find((enrollment) => enrollment.locationId === selectedLocationId) ?? enrollments[0];
  }, [enrollments, selectedLocationId]);

  const totalPoints = useMemo(() => {
    if (!redeemingItem) return 0;
    const pointsEach = redeemingItem.reward.pointsRequired ?? 0;
    return pointsEach * quantity;
  }, [redeemingItem, quantity]);

  const handleRedeemClick = (item: RewardItem) => {
    if (!activeEnrollment) return;
    setRedeemingItem({ enrollment: activeEnrollment, reward: item });
    setQuantity(1);
    setRedemptionQr(null);
    setError(null);
  };

  const closeModal = () => {
    setRedeemingItem(null);
    setQuantity(1);
    setRedemptionQr(null);
    setError(null);
  };

  const handleConfirmRedeem = async () => {
    if (!redeemingItem) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/customer/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: redeemingItem.enrollment.id,
          rewardItemId: redeemingItem.reward.id,
          quantity,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { token?: string; redemptionIntentId?: string; error?: string };

      if (!response.ok || !data.token) {
        setError(data.error ?? "Unable to start redemption");
        return;
      }

      setRedemptionQr(data.token);
    } catch (redeemError) {
      console.error(redeemError);
      setError("Unable to start redemption");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <RewardCard key={item.id} item={item} onRedeem={handleRedeemClick} />
            ))}
          </div>
        )}
      </div>

      {redeemingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-indigo-500/20">
            {!redemptionQr ? (
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Redeem</p>
                  <h3 className="text-xl font-semibold text-white">
                    {quantity} × {redeemingItem.reward.name}
                  </h3>
                  <p className="text-sm text-slate-300">
                    Spend {totalPoints} points?
                  </p>
                </div>

                {redeemingItem.reward.pointsRequired == null ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                    This reward cannot be redeemed right now.
                  </p>
                ) : null}

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  <label className="flex flex-col text-xs uppercase tracking-[0.15em] text-indigo-200">
                    Quantity
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(event) => {
                        const parsed = Number(event.target.value);
                        setQuantity(Number.isNaN(parsed) || parsed < 1 ? 1 : Math.floor(parsed));
                      }}
                      className="mt-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                    />
                  </label>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">Your points</p>
                    <p className="text-lg font-semibold text-white">{redeemingItem.enrollment.cachedPoints}</p>
                  </div>
                </div>

                {redeemingItem.enrollment.cachedPoints < totalPoints ? (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    Insufficient funds. You need {totalPoints} points but only have {redeemingItem.enrollment.cachedPoints}.
                  </p>
                ) : null}

                {error ? (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {error}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRedeem}
                    disabled={
                      isSubmitting ||
                      redeemingItem.reward.pointsRequired == null ||
                      redeemingItem.enrollment.cachedPoints < totalPoints
                    }
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Show this QR to staff</p>
                <div className="mx-auto inline-flex rounded-2xl border border-white/10 bg-white p-4 shadow-lg shadow-indigo-500/10">
                  <QRCodeSVG
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/staff/scan?token=${redemptionQr}`}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                  />
                </div>
                <p className="text-sm text-slate-300">
                  A team member will scan this code to complete your redemption.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:text-white"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

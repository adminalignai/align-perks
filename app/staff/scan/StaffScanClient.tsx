"use client";

import { useEffect, useState } from "react";

type RedemptionPreview = {
  redemptionIntentId: string;
  customerName: string;
  rewardName: string;
  pointsSpent: number;
};

export default function StaffScanClient({ token }: { token: string | null }) {
  const [preview, setPreview] = useState<RedemptionPreview | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "invalid" | "ready" | "completed" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setMessage("Invalid or Expired QR Code");
      return;
    }

    const validate = async () => {
      setStatus("loading");
      setMessage(null);

      try {
        const response = await fetch(`/api/staff/redeem/verify?token=${encodeURIComponent(token)}`);
        const data = (await response.json().catch(() => ({}))) as Partial<RedemptionPreview> & { error?: string };

        if (!response.ok || !data.redemptionIntentId) {
          setStatus("invalid");
          setMessage(data.error ?? "Invalid or Expired QR Code");
          return;
        }

        setPreview({
          redemptionIntentId: data.redemptionIntentId,
          customerName: data.customerName ?? "Customer",
          rewardName: data.rewardName ?? "Reward",
          pointsSpent: data.pointsSpent ?? 0,
        });
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("error");
        setMessage("Unable to validate QR code");
      }
    };

    void validate();
  }, [token]);

  const completeRedemption = async () => {
    if (!token) return;

    setIsCompleting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/staff/redeem/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        setStatus(response.status === 400 ? "invalid" : "error");
        setMessage(data.error ?? "Unable to complete redemption");
        return;
      }

      setStatus("completed");
      setMessage("Redemption completed successfully");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("Unable to complete redemption");
    } finally {
      setIsCompleting(false);
    }
  };

  const renderContent = () => {
    if (status === "loading" || status === "idle") {
      return <p className="text-slate-300">Checking QR code...</p>;
    }

    if (status === "invalid") {
      return (
        <div className="space-y-3 text-center">
          <p className="text-lg font-semibold text-white">Invalid or Expired QR Code</p>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="space-y-3 text-center">
          <p className="text-lg font-semibold text-white">Something went wrong</p>
          {message ? <p className="text-sm text-slate-300">{message}</p> : null}
        </div>
      );
    }

    if (status === "completed") {
      return (
        <div className="space-y-3 text-center">
          <p className="text-lg font-semibold text-white">Redemption completed</p>
          <p className="text-sm text-slate-300">Enjoy your reward!</p>
        </div>
      );
    }

    if (status === "ready" && preview) {
      return (
        <div className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Valid Reward!</p>
          <p className="text-xl font-semibold text-white">
            {preview.customerName} is redeeming {preview.rewardName}.
          </p>
          <p className="text-sm text-slate-300">Points to deduct: {preview.pointsSpent}</p>

          {message ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={completeRedemption}
            disabled={isCompleting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCompleting ? "Completing..." : "Complete Redemption"}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-indigo-500/10 backdrop-blur">
      {renderContent()}
    </div>
  );
}

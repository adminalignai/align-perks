"use client";

import { useState } from "react";

type DashboardIntroProps = {
  hasSeenDashboardIntro: boolean;
  onAcknowledge: () => Promise<void>;
};

export default function DashboardIntro({
  hasSeenDashboardIntro,
  onAcknowledge,
}: DashboardIntroProps) {
  const [isVisible, setIsVisible] = useState(!hasSeenDashboardIntro);
  const [isPending, setIsPending] = useState(false);

  if (!isVisible) {
    return null;
  }

  const handleAcknowledge = async () => {
    setIsPending(true);
    try {
      await onAcknowledge();
      setIsVisible(false);
    } catch (error) {
      console.error("Failed to acknowledge dashboard intro", error);
      setIsPending(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-indigo-500/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 rounded-xl bg-slate-800 p-6 text-center text-slate-200">
          <p className="text-lg font-semibold text-white">How to use this program</p>
          <p className="text-sm text-slate-400">(Video placeholder)</p>
        </div>
        <button
          type="button"
          onClick={handleAcknowledge}
          disabled={isPending}
          className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 md:w-auto ${
            isPending
              ? "cursor-wait bg-slate-700 text-slate-400"
              : "bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-300"
          }`}
        >
          {isPending ? "Saving..." : "I understand how to use this program!"}
        </button>
      </div>
    </section>
  );
}

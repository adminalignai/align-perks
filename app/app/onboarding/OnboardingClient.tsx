"use client";

import { useEffect, useState } from "react";

type OnboardingClientProps = {
  onComplete: () => Promise<void>;
};

const WATCH_DURATION_MS = 10_000;

export default function OnboardingClient({ onComplete }: OnboardingClientProps) {
  const [isReady, setIsReady] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), WATCH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!isReady || isPending) return;

    setError(null);
    setIsPending(true);

    try {
      await onComplete();
    } catch (err) {
      console.error("Failed to complete onboarding", err);
      setError("Something went wrong. Please try again.");
      setIsPending(false);
    }
  };

  const isDisabled = !isReady || isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center rounded-2xl bg-slate-800 p-10 text-center text-slate-300">
        <div className="max-w-xl space-y-2">
          <p className="text-2xl font-semibold text-white">
            Welcome to Align Perks! Please watch this short video.
          </p>
          <p className="text-sm text-slate-400">
            (Video placeholder)
          </p>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-amber-300">{error}</p>
      ) : null}
      <button
        type="button"
        disabled={isDisabled}
        onClick={handleSubmit}
        className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          isDisabled
            ? "cursor-not-allowed bg-slate-700 text-slate-400"
            : "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-300"
        }`}
      >
        {isPending ? "Saving..." : "Continue to Dashboard"}
      </button>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";

export default function AdminOnboardingPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [address, setAddress] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repairStatus, setRepairStatus] = useState("");
  const [isRepairing, setIsRepairing] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInviteLink("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          ghlLocationId,
          name: restaurantName,
          addressLine1: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Request failed");
      }

      setInviteLink(data.inviteLink || "");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepair = async () => {
    if (!adminSecret) {
      setRepairStatus("Please enter the Admin Secret before repairing.");
      return;
    }

    setRepairStatus("");
    setIsRepairing(true);

    try {
      const response = await fetch("/api/admin/db-repair", {
        method: "POST",
        headers: {
          "x-admin-secret": adminSecret,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Request failed");
      }

      setRepairStatus(
        "Database repaired successfully. You can now generate invites.",
      );
    } catch (repairError) {
      setRepairStatus(
        repairError instanceof Error
          ? repairError.message
          : "An unexpected error occurred",
      );
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900/70 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Super Admin</p>
          <h1 className="text-3xl font-semibold">Onboard a Restaurant</h1>
          <p className="text-slate-400">
            Enter the Admin Secret to unlock onboarding tools.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm text-slate-300" htmlFor="admin-secret">
            Admin Secret
          </label>
          <input
            id="admin-secret"
            type="password"
            value={adminSecret}
            onChange={(event) => setAdminSecret(event.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <p className="text-xs text-slate-500">
            This will be sent with each request to authenticate your actions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="ghlLocationId">
                GHL Location ID <span className="text-red-400">*</span>
              </label>
              <input
                id="ghlLocationId"
                type="text"
                required
                value={ghlLocationId}
                onChange={(event) => setGhlLocationId(event.target.value)}
                placeholder="Enter GHL Location ID"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="restaurantName">
                Restaurant Name <span className="text-red-400">*</span>
              </label>
              <input
                id="restaurantName"
                type="text"
                required
                value={restaurantName}
                onChange={(event) => setRestaurantName(event.target.value)}
                placeholder="Enter Restaurant Name"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="address">
                Address (Optional)
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Street, City, State"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:bg-blue-700/50"
            disabled={isSubmitting || !adminSecret}
          >
            {isSubmitting ? "Generating..." : "Generate Invite Link"}
          </button>
        </form>

        <hr className="border-slate-800 my-8" />

        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Maintenance</p>
          <button
            type="button"
            onClick={handleRepair}
            className="w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 disabled:cursor-not-allowed disabled:bg-orange-700/50"
            disabled={isRepairing}
          >
            {isRepairing ? "Repairing..." : "Repair Database Schema"}
          </button>
          {repairStatus && (
            <p className="text-sm text-slate-300">{repairStatus}</p>
          )}
        </div>

        {inviteLink && (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Invite Link</p>
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-lg font-medium text-green-200 break-all">
              {inviteLink}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

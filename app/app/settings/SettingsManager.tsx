"use client";

import { FormEvent, useMemo, useState } from "react";

interface LocationSummary {
  name: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

interface Props {
  owner: { name: string; email: string; phone: string | null; hasStaffPin: boolean };
  location: LocationSummary | null;
}

export default function SettingsManager({ owner, location }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pinStatus, setPinStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [updatingPin, setUpdatingPin] = useState(false);

  const formattedAddress = useMemo(() => {
    if (!location) return "No address on file";
    const line1 = location.addressLine1 ?? "No address on file";
    const cityStateZip = [location.city, location.state, location.postalCode].filter(Boolean).join(", ");
    return cityStateZip ? `${line1}\n${cityStateZip}` : line1;
  }, [location]);

  const handlePasswordUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordStatus(null);
    setUpdatingPassword(true);

    if (!currentPassword || !newPassword) {
      setPasswordStatus({ type: "error", message: "Enter your current and new password." });
      setUpdatingPassword(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", currentPassword, newPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPasswordStatus({ type: "error", message: data.error ?? "Unable to update password." });
        return;
      }

      setPasswordStatus({ type: "success", message: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      console.error("Failed to update password", err);
      setPasswordStatus({ type: "error", message: "Unexpected error. Please try again." });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handlePinUpdate = async (event: FormEvent) => {
    event.preventDefault();
    setPinStatus(null);
    setUpdatingPin(true);

    if (!/^\\d{4}$/.test(newPin)) {
      setPinStatus({ type: "error", message: "Enter a 4-digit staff PIN." });
      setUpdatingPin(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pin", newPin }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPinStatus({ type: "error", message: data.error ?? "Unable to update PIN." });
        return;
      }

      setPinStatus({ type: "success", message: "Staff PIN updated successfully." });
      setNewPin("");
    } catch (err) {
      console.error("Failed to update pin", err);
      setPinStatus({ type: "error", message: "Unexpected error. Please try again." });
    } finally {
      setUpdatingPin(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Account Info</p>
          <h3 className="text-lg font-semibold text-white">Account Info</h3>
          <p className="text-sm text-slate-300">Review your owner and restaurant details.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-slate-200">Owner Name</label>
            <input
              type="text"
              value={owner.name}
              disabled
              className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-slate-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-200">Restaurant Name</label>
            <input
              type="text"
              value={location?.name ?? "No restaurant on file"}
              disabled
              className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-slate-400"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-slate-200">Address</label>
          <textarea
            value={formattedAddress}
            disabled
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-slate-400"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-slate-200">Owner Email</label>
            <input
              type="email"
              value={owner.email}
              disabled
              className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-slate-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-200">Owner Phone</label>
            <input
              type="text"
              value={owner.phone ?? "Not provided"}
              disabled
              className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-slate-400"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Security</p>
              <h3 className="text-lg font-semibold text-white">Change Password</h3>
              <p className="text-sm text-slate-300">Update your owner portal password.</p>
            </div>
          </div>

          <form className="space-y-3 text-sm" onSubmit={handlePasswordUpdate}>
            <div className="space-y-1">
              <label className="text-slate-200">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-200">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                placeholder="Enter new password"
              />
            </div>
            {passwordStatus ? (
              <p className={`text-sm ${passwordStatus.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
                {passwordStatus.message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:opacity-60"
            >
              {updatingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-lg shadow-indigo-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Security</p>
              <h3 className="text-lg font-semibold text-white">Staff PIN</h3>
              <p className="text-sm text-slate-300">Set a new 4-digit staff PIN.</p>
            </div>
          </div>

          <form className="space-y-3 text-sm" onSubmit={handlePinUpdate}>
            <div className="space-y-1">
              <label className="text-slate-200">New Staff PIN (4 digits)</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                placeholder="••••"
                inputMode="numeric"
                pattern="\\d{4}"
                maxLength={4}
              />
            </div>
            {pinStatus ? (
              <p className={`text-sm ${pinStatus.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
                {pinStatus.message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={updatingPin}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:opacity-60"
            >
              {updatingPin ? "Updating..." : owner.hasStaffPin ? "Update PIN" : "Set PIN"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

function CustomerLoginClient() {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const response = await fetch("/api/customer/auth/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus(data.error ?? "Unable to send magic link");
        return;
      }

      const redirectHint = searchParams.get("redirect");
      const helpText = redirectHint ? ` Use the magic link to return to ${redirectHint}.` : "";
      setStatus(`If we found an account for that number, a login link is on its way.${helpText}`);
    } catch (error) {
      console.error("Magic link request failed", error);
      setStatus("Unexpected error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-indigo-500/10 backdrop-blur">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-200">Align Perks</p>
          <h1 className="text-2xl font-semibold">Customer Login</h1>
          <p className="text-sm text-slate-300">
            Enter your phone number and we&apos;ll text you a magic link to view your perks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">Phone number</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(555) 123-4567"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Login Link"}
          </button>
        </form>

        {status ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-indigo-100">
            {status}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export default CustomerLoginClient;

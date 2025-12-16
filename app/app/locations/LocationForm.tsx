"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LocationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, addressLine1, city, state, postalCode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Unable to create location");
        return;
      }

      setName("");
      setAddressLine1("");
      setCity("");
      setState("");
      setPostalCode("");
      router.refresh();
    } catch (err) {
      console.error("Failed to create location", err);
      setError("Unexpected error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-3 text-sm" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-slate-200">Location name</label>
        <input
          className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-slate-200">Address (optional)</label>
        <input
          className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          type="text"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="123 Future St"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          className="col-span-1 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
        />
        <input
          className="col-span-1 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State"
        />
        <input
          className="col-span-1 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          type="text"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="ZIP"
        />
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create location"}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Client = {
  id: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  cachedPoints: number;
};

type Draft = {
  firstName: string;
  lastName: string;
  phoneDigits: string;
  phoneDisplay: string;
  email: string;
};

type Country = {
  label: string;
  dialCode: string;
  flag: string;
};

const countries: Country[] = [
  { label: "United States (+1)", dialCode: "+1", flag: "🇺🇸" },
  { label: "Canada (+1)", dialCode: "+1", flag: "🇨🇦" },
  { label: "United Kingdom (+44)", dialCode: "+44", flag: "🇬🇧" },
  { label: "Australia (+61)", dialCode: "+61", flag: "🇦🇺" },
];

function extractDigits(value: string) {
  const digits = value.replace(/\D+/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function formatPhoneInput(digits: string) {
  if (digits.length >= 10) {
    const baseDigits = digits.slice(0, 10);
    const formatted = `(${baseDigits.slice(0, 3)}) ${baseDigits.slice(3, 6)}-${baseDigits.slice(6, 10)}`;
    const remaining = digits.slice(10);
    return remaining ? `${formatted} ${remaining}` : formatted;
  }

  return digits;
}

function isEmailValid(email: string) {
  return /.+@.+\..+/.test(email.trim());
}

function buildDraft(client: Client): Draft {
  const digits = extractDigits(client.phone);
  return {
    firstName: client.firstName,
    lastName: client.lastName,
    phoneDigits: digits,
    phoneDisplay: formatPhoneInput(digits),
    email: client.email ?? "",
  };
}

interface Props {
  locationId: string;
  initialClients: Client[];
  isStaff?: boolean;
}

export default function ClientManager({ locationId, initialClients, isStaff = false }: Props) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    return initialClients.reduce<Record<string, Draft>>((map, client) => {
      map[client.enrollmentId] = buildDraft(client);
      return map;
    }, {});
  });

  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addPhoneDigits, setAddPhoneDigits] = useState("");
  const [addPhoneDisplay, setAddPhoneDisplay] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<Client | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);

  const parsedPurchaseAmount = Number.parseFloat(purchaseAmount);
  const previewPoints = Number.isFinite(parsedPurchaseAmount) && parsedPurchaseAmount > 0
    ? Math.floor(parsedPurchaseAmount)
    : 0;

  useEffect(() => {
    setClients(initialClients);
    setDrafts(
      initialClients.reduce<Record<string, Draft>>((map, client) => {
        map[client.enrollmentId] = buildDraft(client);
        return map;
      }, {}),
    );
  }, [initialClients]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) => {
      return (
        client.firstName.toLowerCase().includes(query) ||
        client.lastName.toLowerCase().includes(query) ||
        (client.email ?? "").toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query)
      );
    });
  }, [clients, search]);

  const addFormValid = Boolean(
    addFirstName.trim() &&
    addLastName.trim() &&
    addPhoneDigits.trim() &&
    addEmail.trim() &&
    isEmailValid(addEmail),
  );

  const handleAddPhoneChange = (value: string) => {
    const digits = extractDigits(value);
    setAddPhoneDigits(digits);
    setAddPhoneDisplay(formatPhoneInput(digits));
  };

  const handleDraftChange = (enrollmentId: string, field: keyof Draft, value: string) => {
    setDrafts((current) => {
      const next = { ...current };
      const existing = next[enrollmentId] ?? {
        firstName: "",
        lastName: "",
        phoneDigits: "",
        phoneDisplay: "",
        email: "",
      };

      if (field === "phoneDisplay") {
        const digits = extractDigits(value);
        existing.phoneDigits = digits;
        existing.phoneDisplay = formatPhoneInput(digits);
      } else if (field === "phoneDigits") {
        existing.phoneDigits = value;
        existing.phoneDisplay = formatPhoneInput(value);
      } else {
        (existing as Record<string, string>)[field] = value;
      }

      next[enrollmentId] = { ...existing };
      return next;
    });
  };

  const handleAddClient = async (event: FormEvent) => {
    event.preventDefault();
    if (!addFormValid) return;

    setAdding(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          firstName: addFirstName.trim(),
          lastName: addLastName.trim(),
          phone: `${selectedCountry.dialCode}${addPhoneDigits}`,
          email: addEmail.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        client?: Client;
        error?: string;
      };

      if (!response.ok || !data.client) {
        setError(data.error ?? "Unable to add client.");
        return;
      }

      setClients((current) => [data.client!, ...current]);
      setDrafts((current) => ({
        ...current,
        [data.client!.enrollmentId]: buildDraft(data.client!),
      }));
      setAddFirstName("");
      setAddLastName("");
      setAddPhoneDigits("");
      setAddPhoneDisplay("");
      setAddEmail("");
      setStatus("Client added");
    } catch (err) {
      console.error("Failed to add client", err);
      setError("Unexpected error while adding client.");
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async (client: Client) => {
    const draft = drafts[client.enrollmentId];
    if (!draft) return;

    setSavingId(client.enrollmentId);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/clients/${client.enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          phone: draft.phoneDigits,
          email: draft.email.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        client?: Client;
        error?: string;
      };

      if (!response.ok || !data.client) {
        setError(data.error ?? "Unable to save client changes.");
        return;
      }

      setClients((current) =>
        current.map((existing) =>
          existing.enrollmentId === data.client!.enrollmentId ? data.client! : existing,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [data.client!.enrollmentId]: buildDraft(data.client!),
      }));
      setStatus("Client saved");
    } catch (err) {
      console.error("Failed to update client", err);
      setError("Unexpected error while saving client.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;

    setDeletingId(client.enrollmentId);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/clients/${client.enrollmentId}`, {
        method: "DELETE",
      });

      const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        setError(data.error ?? "Unable to delete client.");
        return;
      }

      setClients((current) => current.filter((entry) => entry.enrollmentId !== client.enrollmentId));
      setDrafts((current) => {
        const next = { ...current };
        delete next[client.enrollmentId];
        return next;
      });
      setStatus("Client removed");
    } catch (err) {
      console.error("Failed to delete client", err);
      setError("Unexpected error while deleting client.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseTarget) return;

    const amount = Number.parseFloat(purchaseAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid purchase amount.");
      return;
    }

    setPurchaseSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/points/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: purchaseTarget.enrollmentId,
          amount,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        newPoints?: number;
        error?: string;
      };

      if (!response.ok || !data.success || typeof data.newPoints !== "number") {
        setError(data.error ?? "Unable to log purchase.");
        return;
      }

      setClients((current) =>
        current.map((client) =>
          client.enrollmentId === purchaseTarget.enrollmentId
            ? { ...client, cachedPoints: data.newPoints }
            : client,
        ),
      );

      setStatus("Points added");
      setPurchaseTarget(null);
      setPurchaseAmount("");
    } catch (err) {
      console.error("Failed to log purchase", err);
      setError("Unexpected error while logging purchase.");
    } finally {
      setPurchaseSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isStaff ? (
        <div className="sticky top-0 z-10 space-y-3 rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-indigo-500/10 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Add Client</p>
              <p className="text-sm text-slate-300">Enroll a client into this location instantly.</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              <span>Active location locked</span>
            </div>
          </div>

          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleAddClient}>
            <input
              value={addFirstName}
              onChange={(event) => setAddFirstName(event.target.value)}
              placeholder="First Name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
            />
            <input
              value={addLastName}
              onChange={(event) => setAddLastName(event.target.value)}
              placeholder="Last Name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
            />
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus-within:border-indigo-400">
              <select
                value={selectedCountry.label}
                onChange={(event) => {
                  const next = countries.find((country) => country.label === event.target.value);
                  if (next) setSelectedCountry(next);
                }}
                className="w-32 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
              >
                {countries.map((country) => (
                  <option key={country.label} value={country.label}>
                    {country.flag} {country.dialCode}
                  </option>
                ))}
              </select>
              <input
                value={addPhoneDisplay}
                onChange={(event) => handleAddPhoneChange(event.target.value)}
                placeholder="Phone Number"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <input
              value={addEmail}
              onChange={(event) => setAddEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
            />
            <div className="md:col-span-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={!addFormValid || adding}
                className="rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {adding ? "Saving..." : "Save Client"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="space-y-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search clients by name, phone, or email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
        />
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {status ? <p className="text-sm text-emerald-200">{status}</p> : null}
      </div>

      <div className="max-h-[65vh] space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-2 shadow-inner shadow-indigo-500/10">
        {filteredClients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-300">
            No clients found. Add a client above to get started.
          </div>
        ) : (
          filteredClients.map((client) => {
            const draft = drafts[client.enrollmentId] ?? buildDraft(client);
            const originalDigits = extractDigits(client.phone);
            const isDirty =
              draft.firstName.trim() !== client.firstName.trim() ||
              draft.lastName.trim() !== client.lastName.trim() ||
              draft.email.trim() !== (client.email ?? "").trim() ||
              draft.phoneDigits.trim() !== originalDigits.trim();
            const rowValid = Boolean(
              draft.firstName.trim() &&
              draft.lastName.trim() &&
              draft.phoneDigits.trim() &&
              draft.email.trim() &&
              isEmailValid(draft.email),
            );

            return (
              <div
                key={client.enrollmentId}
                className="flex flex-col gap-3 rounded-xl px-4 py-3 transition hover:bg-white/5 even:bg-slate-50/5 odd:bg-transparent md:flex-row md:items-center md:gap-4"
              >
                <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-3">
                  <input
                    value={draft.firstName}
                    onChange={(event) => handleDraftChange(client.enrollmentId, "firstName", event.target.value)}
                    disabled={isStaff}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-400 transition focus:border-white/30 focus:outline-none hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="First Name"
                  />
                  <input
                    value={draft.lastName}
                    onChange={(event) => handleDraftChange(client.enrollmentId, "lastName", event.target.value)}
                    disabled={isStaff}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-400 transition focus:border-white/30 focus:outline-none hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="Last Name"
                  />
                  <input
                    value={draft.phoneDisplay}
                    onChange={(event) => handleDraftChange(client.enrollmentId, "phoneDisplay", event.target.value)}
                    disabled={isStaff}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-400 transition focus:border-white/30 focus:outline-none hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="Phone"
                  />
                  <input
                    value={draft.email}
                    onChange={(event) => handleDraftChange(client.enrollmentId, "email", event.target.value)}
                    disabled={isStaff}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-3 py-2 text-sm text-white placeholder:text-slate-400 transition focus:border-white/30 focus:outline-none hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                    placeholder="Email"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                  <span className="rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-100 shadow-inner shadow-indigo-500/10">
                    {client.cachedPoints} pts
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseTarget(client);
                      setPurchaseAmount("");
                      setStatus(null);
                      setError(null);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-50 shadow-inner shadow-emerald-500/20 transition hover:border-emerald-300 hover:bg-emerald-500/25"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-200">$</span>
                    Log Purchase
                  </button>
                  {isDirty && !isStaff ? (
                    <button
                      type="button"
                      onClick={() => handleSave(client)}
                      disabled={savingId === client.enrollmentId || !rowValid}
                      className="rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-100 shadow-inner shadow-indigo-500/20 transition hover:border-indigo-300 hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingId === client.enrollmentId ? "Saving..." : "Save"}
                    </button>
                  ) : null}
                  {!isStaff ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(client)}
                      disabled={deletingId === client.enrollmentId}
                      className="group flex items-center gap-1 rounded-lg border border-white/10 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-4 w-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.75 4.5h4.5m-8.25 2.25h12l-.75 12.75a1.5 1.5 0 0 1-1.5 1.5h-7.5a1.5 1.5 0 0 1-1.5-1.5L6 6.75zm2.25 0V3.75A1.5 1.5 0 0 1 9.75 2.25h4.5a1.5 1.5 0 0 1 1.5 1.5V6.75"
                        />
                      </svg>
                      {deletingId === client.enrollmentId ? "Removing" : "Delete"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {purchaseTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Log purchase</p>
                <h3 className="text-lg font-semibold text-white">
                  {purchaseTarget.firstName} {purchaseTarget.lastName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPurchaseTarget(null);
                  setPurchaseAmount("");
                  setPurchaseSubmitting(false);
                }}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-white/30 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="space-y-1 text-sm text-slate-200">
                <span className="block text-xs uppercase tracking-[0.2em] text-indigo-200">Purchase Amount ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseAmount}
                  onChange={(event) => setPurchaseAmount(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none"
                  placeholder="25.50"
                />
              </label>

              <p className="text-sm text-slate-300">
                Points to add: <span className="font-semibold text-emerald-200">{previewPoints}</span>
              </p>

              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={purchaseSubmitting || !(Number.isFinite(parsedPurchaseAmount) && parsedPurchaseAmount > 0)}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {purchaseSubmitting ? "Logging..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

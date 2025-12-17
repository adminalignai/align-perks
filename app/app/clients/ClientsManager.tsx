"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Customer, Enrollment, Location } from "@prisma/client";

type EnrollmentWithCustomer = Enrollment & { customer: Customer };

interface Props {
  locations: Location[];
  initialClients: EnrollmentWithCustomer[];
  initialLocationId: string;
}

const countryOptions = [
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+61", label: "🇦🇺 +61" },
];

function buildPhoneNumber(code: string, input: string) {
  const digitsOnly = input.replace(/\D/g, "");
  const countryDigits = code.replace(/\D/g, "");

  if (!digitsOnly) return code;

  if (digitsOnly.startsWith(countryDigits)) {
    return `+${digitsOnly}`;
  }

  return `+${countryDigits}${digitsOnly}`;
}

export default function ClientsManager({
  locations,
  initialClients,
  initialLocationId,
}: Props) {
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [clients, setClients] = useState<EnrollmentWithCustomer[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [countryCode, setCountryCode] = useState(countryOptions[0].code);
  const [adding, setAdding] = useState(false);

  const [editedRows, setEditedRows] = useState<Record<string, Partial<{ firstName: string; lastName: string; email: string; phone: string }>>>(
    {},
  );
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);

  const initialLoad = useRef(true);

  useEffect(() => {
    if (!selectedLocationId) {
      setClients([]);
      return;
    }

    if (initialLoad.current && selectedLocationId === initialLocationId && !searchTerm.trim()) {
      initialLoad.current = false;
      return;
    }

    initialLoad.current = false;
    const controller = new AbortController();

    const fetchClients = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ locationId: selectedLocationId });
        if (searchTerm.trim()) params.set("query", searchTerm.trim());

        const response = await fetch(`/api/clients?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Unable to load clients");
        }

        const data = (await response.json()) as { enrollments: EnrollmentWithCustomer[] };
        setClients(data.enrollments);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message ?? "Failed to load clients");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchClients();

    return () => controller.abort();
  }, [selectedLocationId, searchTerm, initialLocationId]);

  const selectedLocationName = useMemo(
    () => locations.find((location) => location.id === selectedLocationId)?.name ?? "selected location",
    [locations, selectedLocationId],
  );

  const canAdd = [newFirstName, newLastName, newPhone, newEmail].every((value) => value.trim().length > 0);

  const handleAddClient = async () => {
    if (!selectedLocationId) {
      setError("Choose a location before adding clients.");
      return;
    }

    if (!canAdd) return;

    setAdding(true);
    setError(null);

    try {
      const phone = buildPhoneNumber(countryCode, newPhone);

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newFirstName,
          lastName: newLastName,
          phone,
          email: newEmail,
          locationId: selectedLocationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to add client");
      }

      const data = (await response.json()) as { enrollment: EnrollmentWithCustomer };
      setClients((current) => [data.enrollment, ...current]);
      setNewFirstName("");
      setNewLastName("");
      setNewPhone("");
      setNewEmail("");
    } catch (err) {
      setError((err as Error).message ?? "Failed to add client");
    } finally {
      setAdding(false);
    }
  };

  const handleInlineChange = (
    enrollment: EnrollmentWithCustomer,
    field: "firstName" | "lastName" | "email" | "phone",
    value: string,
  ) => {
    const base = {
      firstName: enrollment.customer.firstName,
      lastName: enrollment.customer.lastName,
      email: enrollment.customer.email ?? "",
      phone: enrollment.customer.phoneE164,
    };

    setEditedRows((prev) => {
      const current = prev[enrollment.id] ?? {};
      const updated = { ...current, [field]: value };

      const hasDiff =
        (updated.firstName ?? base.firstName) !== base.firstName ||
        (updated.lastName ?? base.lastName) !== base.lastName ||
        (updated.email ?? base.email) !== base.email ||
        (updated.phone ?? base.phone) !== base.phone;

      if (!hasDiff) {
        const next = { ...prev };
        delete next[enrollment.id];
        return next;
      }

      return { ...prev, [enrollment.id]: updated };
    });
  };

  const handleSaveRow = async (enrollment: EnrollmentWithCustomer) => {
    const pending = editedRows[enrollment.id];
    if (!pending) return;

    setSavingRowId(enrollment.id);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${enrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: pending.firstName ?? enrollment.customer.firstName,
          lastName: pending.lastName ?? enrollment.customer.lastName,
          email: pending.email ?? enrollment.customer.email ?? "",
          phone: pending.phone ?? enrollment.customer.phoneE164,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to save changes");
      }

      const data = (await response.json()) as { enrollment: EnrollmentWithCustomer };
      setClients((current) =>
        current.map((entry) => (entry.id === enrollment.id ? data.enrollment : entry)),
      );

      setEditedRows((prev) => {
        const next = { ...prev };
        delete next[enrollment.id];
        return next;
      });
    } catch (err) {
      setError((err as Error).message ?? "Failed to save changes");
    } finally {
      setSavingRowId(null);
    }
  };

  const handleDelete = async (enrollment: EnrollmentWithCustomer) => {
    const confirmed = window.confirm(
      "Are you sure? This will remove the client from this location.",
    );

    if (!confirmed) return;

    setDeletingRowId(enrollment.id);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${enrollment.id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to delete client");
      }

      setClients((current) => current.filter((entry) => entry.id !== enrollment.id));
      setEditedRows((prev) => {
        const next = { ...prev };
        delete next[enrollment.id];
        return next;
      });
    } catch (err) {
      setError((err as Error).message ?? "Failed to delete client");
    } finally {
      setDeletingRowId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-indigo-500/10">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-300">Location focus</p>
          <div className="flex flex-wrap gap-2">
            {locations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedLocationId(location.id)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selectedLocationId === location.id
                    ? "border-indigo-300 bg-indigo-500/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                }`}
              >
                {location.name ?? "Unnamed"}
              </button>
            ))}
            {locations.length === 0 ? (
              <span className="text-sm text-slate-400">
                No locations available. Create one to manage clients.
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 space-y-4 rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-indigo-500/10 backdrop-blur">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Add Client</p>
          <p className="text-sm text-slate-300">
            Enroll a new customer for the selected location. Phone numbers use the country code you
            choose.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-400">First Name</label>
            <input
              value={newFirstName}
              onChange={(event) => setNewFirstName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Jane"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-400">Last Name</label>
            <input
              value={newLastName}
              onChange={(event) => setNewLastName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[auto,1fr]">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-400">Country</label>
            <select
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              className="min-w-[140px] rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
            >
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-400">
              Phone (with country code)
            </label>
            <input
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="+1 (312) 555-1234"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-400">Email</label>
          <input
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
            placeholder="customer@email.com"
          />
        </div>

        <button
          type="button"
          onClick={handleAddClient}
          disabled={!canAdd || adding || !selectedLocationId}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? "Saving..." : "Save"}
        </button>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-5 shadow-2xl shadow-indigo-500/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Client List</p>
            <p className="text-sm text-slate-300">
              Showing clients enrolled at {selectedLocationName || "your location"}.
            </p>
          </div>
          <div className="w-full md:w-72">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Search by name, email, or phone"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden grid-cols-[repeat(5,minmax(0,1fr))] bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.15em] text-slate-400 md:grid">
            <span>First Name</span>
            <span>Last Name</span>
            <span>Phone</span>
            <span>Email</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-white/5">
            {clients.length === 0 ? (
              <div className="p-5 text-sm text-slate-300">
                {loading ? "Loading clients..." : "No clients found for this location."}
              </div>
            ) : (
              clients.map((client, index) => {
                const edits = editedRows[client.id];

                return (
                  <div
                    key={client.id}
                    className={`grid grid-cols-1 gap-4 px-4 py-4 transition md:grid-cols-[repeat(5,minmax(0,1fr))] ${
                      index % 2 === 0 ? "bg-white/5" : "bg-transparent"
                    } hover:bg-white/10`}
                  >
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400 md:hidden">
                        First Name
                      </p>
                      <input
                        value={edits?.firstName ?? client.customer.firstName}
                        onChange={(event) =>
                          handleInlineChange(client, "firstName", event.target.value)
                        }
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400 md:hidden">
                        Last Name
                      </p>
                      <input
                        value={edits?.lastName ?? client.customer.lastName}
                        onChange={(event) =>
                          handleInlineChange(client, "lastName", event.target.value)
                        }
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400 md:hidden">
                        Phone
                      </p>
                      <input
                        value={edits?.phone ?? client.customer.phoneE164}
                        onChange={(event) => handleInlineChange(client, "phone", event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400 md:hidden">
                        Email
                      </p>
                      <input
                        value={edits?.email ?? client.customer.email ?? ""}
                        onChange={(event) => handleInlineChange(client, "email", event.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div className="flex items-center justify-start gap-2 md:justify-end">
                      {edits ? (
                        <button
                          type="button"
                          onClick={() => handleSaveRow(client)}
                          disabled={savingRowId === client.id}
                          className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/30 disabled:opacity-60"
                        >
                          {savingRowId === client.id ? "Saving..." : "Save"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDelete(client)}
                        disabled={deletingRowId === client.id}
                        className="rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        {deletingRowId === client.id ? "Removing..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface LocationResponse {
  location: {
    id: string;
    name: string | null;
  };
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("locationId");

  const [locationName, setLocationName] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const fetchLocation = async () => {
      if (!locationId) {
        setError("Missing location.");
        setLoadingLocation(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/public/location?locationId=${encodeURIComponent(locationId)}`,
        );

        if (!response.ok) {
          setError("Location not found.");
          return;
        }

        const data = (await response.json()) as LocationResponse;
        setLocationName(data.location.name);
      } catch (err) {
        console.error("Failed to load location", err);
        setError("Unable to load location.");
      } finally {
        setLoadingLocation(false);
      }
    };

    fetchLocation();
  }, [locationId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!locationId) {
      setError("Missing location.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email,
          locationId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Unable to complete registration.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Registration failed", err);
      setError("Unexpected error, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-gray-900">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
            Rewards Program
          </p>
          <h1 className="text-3xl font-semibold">
            {loadingLocation ? "Loading..." : locationName ?? "Join the program"}
          </h1>
          <p className="text-gray-600">
            Earn rewards every time you visit. Join in seconds—no account required.
          </p>
        </header>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-lg shadow-indigo-500/10">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-12 w-12"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">You&apos;re in!</h2>
              <p className="text-gray-600">
                Check your text messages for your reward link.
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  First Name
                  <input
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  Last Name
                  <input
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Phone
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(555) 123-4567"
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                Email (optional)
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-base text-gray-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-400/30 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {submitting ? "Joining..." : "Join Rewards Program"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-500">
          By joining, you agree to receive automated text messages about your rewards.
        </p>
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InviteSignupPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const inviteCode = params.code;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<
    | { status: "loading" }
    | { status: "invalid"; message: string }
    | { status: "valid"; locationName: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    const validateInvite = async () => {
      setValidation({ status: "loading" });

      try {
        const response = await fetch(`/api/invites/validate?code=${inviteCode}`);
        const data = (await response.json().catch(() => ({}))) as
          | { valid: true; locationName: string }
          | { valid: false; error?: string };

        if (cancelled) return;

        if (!response.ok || !data || !("valid" in data)) {
          setValidation({
            status: "invalid",
            message: "This invite link is invalid or has already been used.",
          });
          return;
        }

        if (data.valid) {
          setValidation({ status: "valid", locationName: data.locationName });
        } else {
          setValidation({
            status: "invalid",
            message: data.error ?? "This invite link is invalid or has already been used.",
          });
        }
      } catch (err) {
        console.error("Failed to validate invite", err);
        if (!cancelled) {
          setValidation({
            status: "invalid",
            message: "This invite link is invalid or has already been used.",
          });
        }
      }
    };

    validateInvite();

    return () => {
      cancelled = true;
    };
  }, [inviteCode]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (validation.status !== "valid") {
      setError("This invite link is invalid or has already been used.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          name,
          phone,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Unable to sign up");
        return;
      }

      router.push("/app");
    } catch (err) {
      console.error("Signup failed", err);
      setError("Unexpected error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12 text-gray-900">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Join with invite</h1>
        {validation.status === "valid" ? (
          <p className="text-sm text-gray-600">
            Join {validation.locationName} with invite code: {inviteCode}
          </p>
        ) : validation.status === "loading" ? (
          <p className="text-sm text-gray-600">Validating invite...</p>
        ) : (
          <p className="text-sm text-red-600">
            {validation.message || "This invite link is invalid or has already been used."}
          </p>
        )}

        {validation.status === "valid" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-600">Full name</span>
              <input
                className="rounded border border-gray-300 px-3 py-2"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-600">Phone (optional)</span>
              <input
                className="rounded border border-gray-300 px-3 py-2"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-600">Email</span>
              <input
                className="rounded border border-gray-300 px-3 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-600">Password</span>
              <input
                className="rounded border border-gray-300 px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}

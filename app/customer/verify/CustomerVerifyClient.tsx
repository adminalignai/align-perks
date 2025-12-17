"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CustomerVerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("Verifying your link...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing or invalid token.");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/customer/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setStatus("error");
          setMessage(data.error ?? "This magic link is invalid or expired.");
          return;
        }

        setStatus("success");
        setMessage("Success! Redirecting you to your perks...");
        setTimeout(() => router.replace("/portal"), 600);
      } catch (error) {
        console.error("Magic link verification failed", error);
        setStatus("error");
        setMessage("We couldn't verify this link. Please request a new one.");
      }
    };

    verifyToken();
  }, [router, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-xl shadow-indigo-500/10 backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-2xl font-semibold text-white">
          AP
        </div>
        <h1 className="text-2xl font-semibold">Checking your magic link</h1>
        <p className="text-sm text-slate-300">{message}</p>
        {status === "error" ? (
          <p className="text-xs text-slate-400">
            You can close this tab and request another link from the login page.
          </p>
        ) : null}
      </div>
    </main>
  );
}

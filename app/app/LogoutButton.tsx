"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="group flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/10 transition hover:border-white/20 hover:bg-white/20 disabled:opacity-60"
    >
      <span className="h-2 w-2 rounded-full bg-gradient-to-br from-rose-400 to-orange-300 shadow-[0_0_12px_rgba(251,113,133,0.6)]" />
      {loading ? "Signing out..." : "Log out"}
    </button>
  );
}

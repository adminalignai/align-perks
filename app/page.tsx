import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.14),transparent_26%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-indigo-200 shadow-lg shadow-indigo-500/10">
            Align Perks Portal
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Restaurant Loyalty &amp; Rewards Management
          </h1>
          <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
            Streamline customer rewards, manage your locations, and keep every guest engaged with a
            unified loyalty experience built for modern restaurants.
          </p>
        </div>

        <Link
          href="/login"
          className="rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-400 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:shadow-indigo-400/30"
        >
          Log In
        </Link>
      </div>
    </main>
  );
}

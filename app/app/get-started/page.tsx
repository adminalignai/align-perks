import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";

export default async function GetStartedPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/get-started");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Get Started</p>
        <h1 className="text-3xl font-semibold text-white">Welcome to Align Perks</h1>
        <p className="text-sm text-slate-300">
          Watch these short videos to get up to speed with your Owner Portal.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "Welcome to Align Perks", description: "Welcome to Align Perks" },
          { title: "How to use the Dashboard", description: "How to use the Dashboard" },
        ].map((video) => (
          <div
            key={video.title}
            className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-500/10"
          >
            <div className="aspect-video w-full rounded-xl bg-slate-800/80 text-slate-300">
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-200">
                Video Placeholder
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-white">{video.title}</p>
              <p className="text-sm text-slate-300">{video.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

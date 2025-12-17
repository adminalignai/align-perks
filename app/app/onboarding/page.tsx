import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

async function completeOnboarding() {
  "use server";

  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/onboarding");
  }

  await prisma.portalUser.update({
    where: { id: session.userId },
    data: { hasCompletedOnboarding: true },
  });

  redirect("/app");
}

export default async function OnboardingPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/onboarding");
  }

  const user = await prisma.portalUser.findUnique({
    where: { id: session.userId },
    select: { hasCompletedOnboarding: true },
  });

  if (!user) {
    redirect("/login?redirect=/app/onboarding");
  }

  if (user.hasCompletedOnboarding) {
    redirect("/app");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-indigo-200">
          Welcome
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Let&apos;s get you started with Align Perks
        </h1>
        <p className="text-sm text-slate-300">
          Watch the brief introduction below. The Continue button will activate once the video has finished.
        </p>
      </div>

      <OnboardingClient onComplete={completeOnboarding} />
    </div>
  );
}

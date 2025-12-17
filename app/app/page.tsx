import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function AppHomeRedirect() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/rewards");
  }

  const user = await prisma.portalUser.findUnique({
    where: { id: session.userId },
    select: { hasCompletedOnboarding: true },
  });

  if (!user) {
    redirect("/login?redirect=/app/rewards");
  }

  if (!user.hasCompletedOnboarding) {
    redirect("/app/onboarding");
  }

  redirect("/app/rewards");
}

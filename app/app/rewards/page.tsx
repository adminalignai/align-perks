import { redirect } from "next/navigation";

import { getActiveLocationIdFromCookies } from "@/lib/activeLocation";
import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureSignupGiftForLocation } from "@/lib/rewards";
import RewardManager from "./RewardManager";

export default async function RewardsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/rewards");
  }
  const isStaff = session.role === "STAFF";

  const locations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: true },
    orderBy: { createdAt: "asc" },
  });

  if (locations.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Reward Items</p>
        <h1 className="text-3xl font-semibold text-white">Add a location to manage rewards</h1>
        <p className="text-sm text-slate-300">
          You don&apos;t have any locations yet. Create a location to start configuring reward items for your clients.
        </p>
      </div>
    );
  }

  const activeLocationId = await getActiveLocationIdFromCookies();
  const activeLocation =
    locations.find(({ location }) => location.id === activeLocationId)?.location ?? locations[0].location;

  await ensureSignupGiftForLocation(activeLocation.id);

  const rewards = await prisma.rewardItem.findMany({
    where: { locationId: activeLocation.id },
    orderBy: [{ createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Reward Items</p>
        <h1 className="text-3xl font-semibold text-white">Manage rewards for {activeLocation.name}</h1>
        <p className="text-sm text-slate-300">
          Add, edit, or disable rewards for this location. The sign-up gift always stays at the top to encourage enrollment.
        </p>
      </div>

      <RewardManager
        locationId={activeLocation.id}
        locationName={activeLocation.name}
        rewards={rewards}
        isStaff={isStaff}
      />
    </div>
  );
}

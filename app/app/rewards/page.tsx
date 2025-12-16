import { redirect } from "next/navigation";
import { RewardItemType } from "@prisma/client";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import RewardsManager from "./RewardsManager";

async function getRewardsForLocation(locationId: string) {
  let rewards = await prisma.rewardItem.findMany({
    where: { locationId },
    orderBy: { createdAt: "asc" },
  });

  const signupGift = rewards.find((reward) => reward.type === RewardItemType.SIGNUP_GIFT);

  if (!signupGift) {
    await prisma.rewardItem.create({
      data: {
        locationId,
        name: "Welcome Reward",
        pointsRequired: 0,
        isUndeletable: true,
        type: RewardItemType.SIGNUP_GIFT,
      },
    });

    rewards = await prisma.rewardItem.findMany({
      where: { locationId },
      orderBy: { createdAt: "asc" },
    });
  }

  return rewards;
}

export default async function RewardsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/rewards");
  }

  const userLocations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: true },
    orderBy: { createdAt: "desc" },
  });

  const locations = userLocations.map(({ location }) => location);
  const primaryLocationId = locations[0]?.id;

  const rewards = primaryLocationId ? await getRewardsForLocation(primaryLocationId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Rewards</p>
        <h1 className="text-3xl font-semibold text-white">Reward items</h1>
        <p className="text-sm text-slate-300">
          Create and manage the items customers can redeem with their points.
        </p>
      </div>

      <RewardsManager locations={locations} initialRewards={rewards} />
    </div>
  );
}

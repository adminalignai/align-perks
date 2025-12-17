import { RewardItemType } from "@prisma/client";

import prisma from "@/lib/prisma";

export async function getUserLocationIds(userId: string): Promise<string[]> {
  const userLocations = await prisma.userLocation.findMany({
    where: { userId },
    select: { locationId: true },
    orderBy: { createdAt: "asc" },
  });

  return userLocations.map((entry) => entry.locationId);
}

export async function ensureSignupGiftForLocation(locationId: string) {
  const existing = await prisma.rewardItem.findFirst({
    where: { locationId, type: RewardItemType.SIGNUP_GIFT },
  });

  if (existing) return existing;

  return prisma.rewardItem.create({
    data: {
      locationId,
      type: RewardItemType.SIGNUP_GIFT,
      name: "Sign-up gift",
      pointsRequired: null,
      isEnabled: true,
      isUndeletable: true,
    },
  });
}

import { redirect } from "next/navigation";

import { getActiveLocationIdFromCookies } from "@/lib/activeLocation";
import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import SettingsManager from "./SettingsManager";

export default async function SettingsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/settings");
  }

  const user = await prisma.portalUser.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, phone: true, staffPinHash: true },
  });

  if (!user) {
    redirect("/login?redirect=/app/settings");
  }

  const activeLocationId = await getActiveLocationIdFromCookies();
  let userLocation = null;

  if (activeLocationId) {
    userLocation = await prisma.userLocation.findFirst({
      where: { userId: session.userId, locationId: activeLocationId },
      include: { location: true },
    });
  }

  if (!userLocation) {
    userLocation = await prisma.userLocation.findFirst({
      where: { userId: session.userId },
      include: { location: true },
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Settings</p>
        <h1 className="text-3xl font-semibold text-white">Account & Security</h1>
        <p className="text-sm text-slate-300">
          Review your account details and keep your credentials secure.
        </p>
      </div>

      <SettingsManager
        owner={{
          name: user.name,
          email: user.email,
          phone: user.phone,
          hasStaffPin: Boolean(user.staffPinHash),
        }}
        location={userLocation?.location ?? null}
      />
    </div>
  );
}

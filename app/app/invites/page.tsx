import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import InviteManager from "./InviteManager";

export default async function InvitesPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/invites");
  }

  const locations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: true },
    orderBy: { createdAt: "desc" },
  });

  const invites = await prisma.invite.findMany({
    where: {
      locationId: { in: locations.map((entry) => entry.locationId) },
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Invites</p>
        <h1 className="text-3xl font-semibold text-white">Invite collaborators</h1>
        <p className="text-sm text-slate-300">
          Generate invite codes for any of your locations and share them instantly.
        </p>
      </div>

      <InviteManager
        locations={locations.map(({ location }) => location)}
        invites={invites}
      />
    </div>
  );
}

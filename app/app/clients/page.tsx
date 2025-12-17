import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ClientsManager from "./ClientsManager";

export default async function ClientsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/clients");
  }

  const locations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: true },
    orderBy: { createdAt: "desc" },
  });

  const locationList = locations.map(({ location }) => location);
  const initialLocationId = locationList[0]?.id ?? "";

  const initialClients = initialLocationId
    ? await prisma.enrollment.findMany({
        where: { locationId: initialLocationId },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Clients</p>
        <h1 className="text-3xl font-semibold text-white">Client management</h1>
        <p className="text-sm text-slate-300">
          Enroll customers for each location, edit their details, and manage access in one place.
        </p>
      </div>

      <ClientsManager
        locations={locationList}
        initialClients={initialClients}
        initialLocationId={initialLocationId}
      />
    </div>
  );
}

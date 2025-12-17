import { redirect } from "next/navigation";

import { getActiveLocationIdFromCookies } from "@/lib/activeLocation";
import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ClientManager from "./ClientManager";

export default async function ClientsPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/clients");
  }

  const userLocations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: true },
    orderBy: { createdAt: "asc" },
  });

  if (userLocations.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Clients</p>
        <h1 className="text-3xl font-semibold text-white">Add a location to manage clients</h1>
        <p className="text-sm text-slate-300">
          You need at least one location before adding or editing clients. Create a location first, then enroll customers.
        </p>
      </div>
    );
  }

  const activeLocationId = await getActiveLocationIdFromCookies();
  const activeLocation =
    userLocations.find(({ location }) => location.id === activeLocationId)?.location ?? userLocations[0].location;

  const enrollments = await prisma.enrollment.findMany({
    where: { locationId: activeLocation.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  const clients = enrollments.map((enrollment) => ({
    enrollmentId: enrollment.id,
    id: enrollment.customer.id,
    firstName: enrollment.customer.firstName,
    lastName: enrollment.customer.lastName,
    phone: enrollment.customer.phoneE164,
    email: enrollment.customer.email,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Clients</p>
        <h1 className="text-3xl font-semibold text-white">Manage clients for {activeLocation.name}</h1>
        <p className="text-sm text-slate-300">
          Add, edit, and remove client enrollments for this location. Changes save instantly to keep your records clean.
        </p>
      </div>

      <ClientManager
        locationId={activeLocation.id}
        initialClients={clients}
      />
    </div>
  );
}

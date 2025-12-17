import { redirect } from "next/navigation";

import { getCustomerSessionFromCookies } from "@/lib/customerAuth";
import prisma from "@/lib/prisma";
import CustomerPortalClient from "./CustomerPortalClient";

export default async function CustomerPortalPage() {
  const session = await getCustomerSessionFromCookies();

  if (!session) {
    redirect("/customer/login");
  }

  const [customer, enrollments] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: session.customerId },
      select: { firstName: true },
    }),
    prisma.enrollment.findMany({
      where: { customerId: session.customerId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            rewardItems: {
              where: { isEnabled: true },
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, imageUrl: true, pointsRequired: true },
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!customer) {
    redirect("/customer/login");
  }

  const formattedEnrollments = enrollments
    .filter((enrollment) => enrollment.location)
    .map((enrollment) => ({
      id: enrollment.id,
      locationId: enrollment.locationId,
      locationName: enrollment.location?.name ?? "Location",
      cachedPoints: enrollment.cachedPoints,
      rewardItems: enrollment.location?.rewardItems ?? [],
    }));

  const defaultLocationId = formattedEnrollments[0]?.locationId ?? null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-200">
            Customer Portal
          </p>
          <h1 className="text-3xl font-semibold">Welcome back, {customer.firstName}!</h1>
          <p className="text-sm text-slate-300">
            Track your points and explore rewards for each of your favorite locations.
          </p>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-indigo-500/10 backdrop-blur">
          {formattedEnrollments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-300">
              You don&apos;t have any enrollments yet. Ask a team member to enroll you at a location to start earning points.
            </div>
          ) : (
            <CustomerPortalClient
              enrollments={formattedEnrollments}
              defaultLocationId={defaultLocationId}
            />
          )}
        </section>
      </div>
    </main>
  );
}

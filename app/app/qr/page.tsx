import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";
import prisma from "@/lib/prisma";
import QrManager from "./QrManager";

export default async function QrPage() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/qr");
  }

  const locations = await prisma.userLocation.findMany({
    where: { userId: session.userId },
    include: { location: { include: { rewardItems: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">QR Code</p>
        <h1 className="text-3xl font-semibold text-white">QR codes & stands</h1>
        <p className="text-sm text-slate-300">
          Generate your registration QR code, customize your countertop stands, and place an order in minutes.
        </p>
      </div>

      <QrManager locations={locations.map(({ location }) => location)} />
    </div>
  );
}

import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth";

export default async function AppHomeRedirect() {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login?redirect=/app/rewards");
  }

  redirect("/app/rewards");
}

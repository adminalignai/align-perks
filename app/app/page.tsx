import { getSessionFromCookies } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSessionFromCookies();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 text-gray-900">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-gray-700">
          You are signed in{session ? ` as ${session.userId}` : ""}. Replace this with
          real portal content.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 py-12 text-gray-900">
      <h1 className="text-3xl font-semibold">Align Perks Portal</h1>
      <p className="text-center text-gray-600">
        Use your invite link to create an account or log in to access the dashboard.
      </p>
      <div className="flex gap-4">
        <Link className="text-blue-600 underline" href="/login">
          Log in
        </Link>
        <Link className="text-blue-600 underline" href="/invite/example">
          Example invite
        </Link>
      </div>
    </main>
  );
}

"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

export default function BannedPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="card-glass max-w-md rounded-2xl border-red-400/30 bg-red-500/10 p-8 text-center dark:border-red-500/30 dark:bg-red-500/10">
        <h1 className="text-xl font-bold text-red-200 sm:text-2xl">
          Account restricted
        </h1>
        <p className="mt-3 text-slate-300 dark:text-slate-400">
          Your account has been restricted and you cannot access this platform.
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
          If you believe this is an error, please contact the organisers.
        </p>
        {session?.user && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-6 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/15"
          >
            Sign out
          </button>
        )}
      </div>
    </main>
  );
}

"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateLabel } from "@/lib/formatDate";

type TeamRow = {
  _id: string;
  teamName: string;
  status: string;
  tournamentId?: { _id: string; name: string; date: string } | string;
};

export default function MyMatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;
    const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
    if (isAdmin) {
      router.replace("/admin");
      return;
    }
    let cancelled = false;
    fetch("/api/users/me/teams", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: TeamRow[]) => {
        if (!cancelled) setTeams(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session?.user, router]);

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/tournaments"
            className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Tournaments
          </Link>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          My registered matches
        </h1>
        <p className="mb-6 text-slate-600 dark:text-slate-400">
          Tournaments you’re registered in. Open a tournament to see rounds and matchups.
        </p>

        {teams.length === 0 ? (
          <div className="card-glass animate-fade-in p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              You’re not registered for any tournaments yet.
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <Link href="/tournaments" className="font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
                Register a team
              </Link>{" "}
              or accept an invite from your{" "}
              <Link href="/profile" className="font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
                Profile
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {teams.map((team) => {
              const tournament = typeof team.tournamentId === "object" && team.tournamentId != null
                ? team.tournamentId
                : null;
              const tournamentId = tournament && "_id" in tournament ? tournament._id : null;
              const tournamentName = tournament && "name" in tournament ? tournament.name : "Tournament";
              const tournamentDate = tournament && "date" in tournament ? tournament.date : "";

              return (
                <li key={team._id} className="card-glass transition-all duration-300 hover:shadow-lg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {tournamentName}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {tournamentDate ? formatDateLabel(tournamentDate) : ""}
                        {tournamentDate && " · "}
                        Team: <span className="font-medium text-slate-700 dark:text-slate-300">{team.teamName}</span>
                        {" · "}
                        <span className="capitalize">{team.status}</span>
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <Link
                        href={`/profile/teams/${team._id}`}
                        className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/15 dark:text-slate-200 dark:hover:bg-white/15"
                      >
                        Team details
                      </Link>
                      {tournamentId && (
                        <Link
                          href={`/tournaments/${tournamentId}/rounds`}
                          className="btn-gradient inline-flex py-2"
                        >
                          View rounds & matches
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-8">
          <Link href="/profile" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
            Profile
          </Link>
          {" · "}
          <Link href="/tournaments" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
            Tournaments
          </Link>
        </p>
      </div>
    </main>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime, formatRegistrationCountdown } from "@/lib/formatDate";

type RoundPublic = {
  _id: string;
  roundNumber: number;
  name: string;
  scheduledAt?: string;
  teamIds: string[];
  teams: { id: string; name: string }[];
};

export default function TournamentRoundsPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [rounds, setRounds] = useState<RoundPublic[]>([]);
  const [tournamentName, setTournamentName] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRounds = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/tournaments/${id}/rounds`);
    if (!res.ok) {
      setError("Failed to load rounds");
      return;
    }
    const data = await res.json();
    setRounds(Array.isArray(data) ? data : []);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/tournaments`)
      .then((r) => r.json())
      .then((list: { _id: string; name: string; registrationDeadline?: string }[]) => {
        const t = list.find((x) => x._id === id);
        setTournamentName(t?.name ?? "Tournament");
        setRegistrationDeadline(t?.registrationDeadline ?? null);
      })
      .catch(() => {});
    fetchRounds().finally(() => setLoading(false));
  }, [id, fetchRounds]);

  const nextRound = rounds.find((r) => r.scheduledAt && new Date(r.scheduledAt) > new Date());

  if (!id) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-slate-600 dark:text-slate-400">Invalid tournament.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/tournaments" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
            ← Tournaments
          </Link>
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          {tournamentName}
        </h1>
        <p className="mb-6 text-slate-600 dark:text-slate-400">
          Rounds and who advanced
        </p>
        {registrationDeadline && (
          <p className="mb-4 text-sm font-medium text-emerald-500 dark:text-emerald-400">
            {formatRegistrationCountdown(registrationDeadline).text}
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <>
            {nextRound && (
              <div className="card-glass mb-6 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-400">
                  Next round
                </h2>
                <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                  {nextRound.name}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {nextRound.scheduledAt ? formatDateTime(nextRound.scheduledAt) : "—"}
                </p>
              </div>
            )}

            <div className="space-y-6">
              {rounds.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-500">
                  No rounds published yet. Check back later.
                </p>
              ) : (
                rounds.map((round) => (
                  <div
                    key={round._id}
                    className="card-glass p-4 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-slate-800 dark:text-slate-200">
                        {round.name}
                      </h2>
                      {round.scheduledAt && (
                        <span className="text-sm text-slate-500 dark:text-slate-500">
                          {formatDateTime(round.scheduledAt)}
                        </span>
                      )}
                    </div>
                    {round.teams.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
                        No teams yet
                      </p>
                    ) : (
                      <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        {round.teams.map((t) => (
                          <li key={t.id}>{t.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

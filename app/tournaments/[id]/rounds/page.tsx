"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatDate";
import { RegistrationCountdown } from "@/components/RegistrationCountdown";
import { SITE } from "@/lib/site";

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
  const [winner, setWinner] = useState<{
    teamName: string;
    rewardReceiverIGN: string;
    players: { minecraftIGN: string; discordUsername: string }[];
  } | null>(null);
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
    setRounds(Array.isArray(data) ? data : (data.rounds ?? []));
    setWinner(data.winner ?? null);
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

  /** Each round = 1 match (4 teams). R11, R12, R13, R14, R2. */
  const getMatchForRound = (round: RoundPublic) => {
    return round.teams.length > 0 ? [round.teams] : [];
  };

  // Teams that reached the final (R2), used to highlight winners in earlier rounds
  const finalRound = rounds.find((r) => r.name === "R2");
  const finalTeamIds = new Set(finalRound?.teamIds ?? []);

  if (!id) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-slate-600 dark:text-slate-400">Invalid tournament.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:px-8 lg:py-16">
        {/* Top banner - matches tournaments page */}
        <div className="card-glass mb-6 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <img
              src={SITE.hostedByLogo}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-white/10"
            />
            <div>
              <p className="text-sm font-medium text-slate-200">
                All matches on <strong>{SITE.serverName}</strong> ·{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-400">{SITE.serverIp}</code>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sponsored by <strong className="text-slate-300">{SITE.hostedBy}</strong> · Full rules &amp; updates on Discord
              </p>
            </div>
          </div>
          <a
            href={SITE.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Join Discord
          </a>
        </div>

        <div className="mb-6">
          <Link
            href="/tournaments"
            className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Tournaments
          </Link>
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {tournamentName}
        </h1>
        <p className="mb-6 text-slate-400">
          Rounds &amp; matches · 4 teams per match, 1 winner advances
        </p>
        {registrationDeadline && (
          <p className="mb-4 text-sm font-medium">
            <RegistrationCountdown
              deadline={registrationDeadline}
              className="text-emerald-500 dark:text-emerald-400"
            />
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
            {error}
          </div>
        )}

        {loading ? (
          <p className="loading-text">Loading…</p>
        ) : (
          <>
            {winner && (
              <div className="card-glass mb-6 border-emerald-400/30 bg-emerald-500/10 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Tournament winner
                </h2>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                  {winner.teamName}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Reward receiver:{" "}
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{winner.rewardReceiverIGN}</span>
                </p>
                {winner.players.length > 0 && (
                  <ul className="mt-3 list-inside list-disc text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
                    {winner.players.map((p, i) => (
                      <li key={i} className="break-words">
                        <span className="font-medium text-slate-700 dark:text-slate-300 break-all">
                          {p.minecraftIGN}
                        </span>
                        <span className="break-all text-slate-500 dark:text-slate-500">
                          {" "}
                          · {p.discordUsername}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

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

            <div className="space-y-8">
              {rounds.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-500">
                  No rounds published yet. Check back later.
                </p>
              ) : (
                <>
                  {/* R11–R14 in a grid */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {rounds
                      .filter((r) => ["R11", "R12", "R13", "R14"].includes(r.name))
                      .map((round) => {
                        const matches = getMatchForRound(round);
                        return (
                          <section key={round._id} className="card-glass p-4 sm:p-5">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <h2 className="font-semibold text-slate-800 dark:text-slate-200">{round.name}</h2>
                              {round.scheduledAt && (
                                <span className="text-xs text-slate-500 dark:text-slate-500">
                                  {formatDateTime(round.scheduledAt)}
                                </span>
                              )}
                            </div>
                            {matches.length === 0 ? (
                              <p className="text-sm text-slate-500 dark:text-slate-500">No teams yet</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {matches[0].map((t) => {
                                  const isWinner = finalTeamIds.has(t.id);
                                  return (
                                    <Link
                                      key={t.id}
                                      href={`/tournaments/${id}/teams/${t.id}`}
                                      className={`flex min-h-[2.5rem] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:ring-2 hover:ring-emerald-400/60 hover:ring-offset-2 hover:ring-offset-slate-950 ${
                                        isWinner
                                          ? "border border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                                          : "border border-white/10 bg-white/5 text-slate-800 dark:text-slate-200"
                                      }`}
                                      title={t.name || "—"}
                                    >
                                      <span className={`min-w-0 flex-1 break-words ${isWinner ? "text-emerald-50" : "text-slate-800 dark:text-slate-200"}`}>
                                        {t.name || "—"}
                                      </span>
                                      {isWinner && (
                                        <span className="ml-1.5 rounded-full bg-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-50">
                                          Winner
                                        </span>
                                      )}
                                    </Link>
                                  );
                                })}
                                {Array.from({ length: Math.max(0, 4 - matches[0].length) }).map((_, i) => (
                                  <div
                                    key={`empty-${i}`}
                                    className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-slate-500 dark:text-slate-500"
                                  >
                                    TBD
                                  </div>
                                ))}
                              </div>
                            )}
                          </section>
                        );
                      })}
                  </div>
                  {/* R2 Final */}
                  {rounds.find((r) => r.name === "R2") && (
                    <section
                      key={rounds.find((r) => r.name === "R2")!._id}
                      className="card-glass w-full ring-2 ring-amber-400/40 p-4 sm:p-5 md:p-6"
                    >
                      {(() => {
                        const round = rounds.find((r) => r.name === "R2")!;
                        const matches = getMatchForRound(round);
                        return (
                          <>
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 sm:text-xl">
                                {round.name}
                                <span className="ml-2 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                                  Final
                                </span>
                              </h2>
                              {round.scheduledAt && (
                                <span className="text-sm text-slate-500 dark:text-slate-500">
                                  {formatDateTime(round.scheduledAt)}
                                </span>
                              )}
                            </div>
                            {matches.length === 0 ? (
                              <p className="text-sm text-slate-500 dark:text-slate-500">
                                Winners from R11–R14 advance here
                              </p>
                            ) : (
                              <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                                {matches[0].map((t) => (
                                  <Link
                                    key={t.id}
                                    href={`/tournaments/${id}/teams/${t.id}`}
                                    className="flex min-h-[2.75rem] items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-800 transition hover:ring-2 hover:ring-emerald-400/60 hover:ring-offset-2 hover:ring-offset-slate-950 dark:text-slate-200"
                                    title={t.name || "—"}
                                  >
                                    <span className="min-w-0 flex-1 break-words">
                                      {t.name || "—"}
                                    </span>
                                  </Link>
                                ))}
                                {Array.from({ length: Math.max(0, 4 - matches[0].length) }).map((_, i) => (
                                  <div
                                    key={`empty-${i}`}
                                    className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-500 dark:text-slate-500"
                                  >
                                    TBD
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </section>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

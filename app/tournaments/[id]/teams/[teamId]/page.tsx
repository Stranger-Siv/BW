"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatDate";

type Player = { minecraftIGN: string; discordUsername: string };

type TeamPublicDetail = {
  teamName: string;
  createdAt: string;
  players: Player[];
  rewardReceiverIGN: string;
  roundInfo: { roundNumber: number; name: string } | null;
  isWinner: boolean;
};

export default function TournamentTeamPublicPage() {
  const params = useParams();
  const tournamentId = typeof params?.id === "string" ? params.id : "";
  const teamId = typeof params?.teamId === "string" ? params.teamId : "";
  const [team, setTeam] = useState<TeamPublicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId || !teamId) {
      setLoading(false);
      setError("Invalid team or tournament.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/tournaments/${tournamentId}/teams/${teamId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load team");
        }
        return res.json();
      })
      .then((data: TeamPublicDetail) => {
        if (!cancelled) setTeam(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load team");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tournamentId, teamId]);

  if (loading) {
    return (
      <main className="page">
        <div className="page-inner">
          <p className="loading-text">Loading team…</p>
        </div>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="page">
        <div className="page-inner">
          <div className="card-lg text-center">
            <h1 className="page-title mb-3">Team details</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {error || "Team not found."}
            </p>
            <p className="mt-4 text-sm">
              <Link href={`/tournaments/${tournamentId}/rounds`} className="back-link">
                ← Back to rounds
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-inner">
        <div className="mb-4">
          <Link href={`/tournaments/${tournamentId}/rounds`} className="back-link">
            ← Back to rounds
          </Link>
        </div>

        <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title mb-1">Team details</h1>
            <p className="page-subtitle">
              {team.teamName}
              {team.isWinner && (
                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                  Winner
                </span>
              )}
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <section className="card animate-fade-in">
            <h2 className="section-title mb-4">Overview</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Team name
                </dt>
                <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100 break-words">
                  {team.teamName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Registered at
                </dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                  {formatDateTime(team.createdAt)}
                </dd>
              </div>
              {team.roundInfo && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Current round
                  </dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                    {team.roundInfo.name}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Reward receiver (IGN)
                </dt>
                <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-100 break-all">
                  {team.rewardReceiverIGN || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card animate-fade-in lg:col-span-1">
            <h2 className="section-title mb-4">Players</h2>
            {team.players.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No players found for this team.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {team.players.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-100 break-all">
                      {p.minecraftIGN}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-all">
                      {p.discordUsername}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}


"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDateLabel } from "@/lib/formatDate";
import { FadeInUp, StaggerChildren, StaggerItem } from "@/components/ui/animations";

type TeamRow = {
  _id: string;
  teamName: string;
  status: string;
  tournamentId?: { _id: string; name: string; date: string } | string;
};

type WinnerInfo = {
  teamName: string;
  rewardReceiverIGN: string;
  players: { minecraftIGN: string; discordUsername: string }[];
};

export default function MyMatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [winners, setWinners] = useState<Record<string, WinnerInfo>>({});
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
        const ids = new Set<string>();
        for (const t of Array.isArray(list) ? list : []) {
          const tour = typeof t.tournamentId === "object" && t.tournamentId != null ? t.tournamentId : null;
          const tid = tour && "_id" in tour ? tour._id : null;
          if (tid) ids.add(tid);
        }
        return Array.from(ids);
      })
      .then((tournamentIds: string[]) => {
        if (cancelled || tournamentIds.length === 0) return;
        return Promise.all(
          tournamentIds.map((tid) =>
            fetch(`/api/tournaments/${tid}/winner`, { cache: "no-store" })
              .then((r) => (r.ok ? r.json() : null))
              .then((w: WinnerInfo | null) => (cancelled ? null : { tid, w }))
          )
        );
      })
      .then((results) => {
        if (cancelled || !results) return;
        const map: Record<string, WinnerInfo> = {};
        for (const r of results) {
          if (r?.w) map[r.tid] = r.w;
        }
        setWinners(map);
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
      <main className="loading-wrap">
        <p className="loading-text">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-inner">
        <div className="mb-6">
          <Link href="/tournaments" className="back-link">
            ← Tournaments
          </Link>
        </div>

        <h1 className="page-title mb-2">My registered matches</h1>
        <p className="page-subtitle mb-6">
          Tournaments you’re registered in. Open a tournament to see rounds and matchups.
        </p>

        {teams.length === 0 ? (
          <div className="card-lg animate-fade-in text-center">
            <p className="text-slate-600 dark:text-slate-400">
              You’re not registered for any tournaments yet.
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <Link href="/tournaments" className="back-link">
                Register a team
              </Link>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <StaggerChildren as="ul" className="space-y-3">
            {teams.map((team) => {
              const tournament = typeof team.tournamentId === "object" && team.tournamentId != null
                ? team.tournamentId
                : null;
              const tournamentId = tournament && "_id" in tournament ? tournament._id : null;
              const tournamentName = tournament && "name" in tournament ? tournament.name : "Tournament";
              const tournamentDate = tournament && "date" in tournament ? tournament.date : "";
              const winner = tournamentId ? winners[tournamentId] : null;

              return (
                <StaggerItem key={team._id} as="li" className="card transition-all duration-300 hover:shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {tournamentName}
                      </p>
                      {winner && (
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Winner: {winner.teamName}
                          {winner.rewardReceiverIGN && ` (Reward: ${winner.rewardReceiverIGN})`}
                        </p>
                      )}
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
                        className="btn-secondary"
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
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        )}

        <p className="mt-8">
          <Link href="/profile" className="back-link">Profile</Link>
          {" · "}
          <Link href="/tournaments" className="back-link">Tournaments</Link>
        </p>
      </div>
    </main>
  );
}

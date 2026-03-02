import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";
import Round from "@/models/Round";
import { formatDateLabel, formatDateTime } from "@/lib/formatDate";

type TeamDoc = {
  _id: mongoose.Types.ObjectId;
  teamName: string;
  createdAt: Date;
  players: { minecraftIGN: string; discordUsername: string }[];
  rewardReceiverIGN?: string;
  status: "pending" | "approved" | "rejected";
  captainId?: mongoose.Types.ObjectId;
  tournamentId?: mongoose.Types.ObjectId;
  tournamentDate?: string;
};

export const dynamic = "force-dynamic";

export default async function TeamProfilePage({ params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectDB();

  const team = (await Team.findById(id)
    .select("teamName createdAt players rewardReceiverIGN status captainId tournamentId tournamentDate")
    .lean()) as unknown as TeamDoc | null;

  if (!team || team.status !== "approved") notFound();

  const tournament =
    team.tournamentId && mongoose.Types.ObjectId.isValid(team.tournamentId)
      ? await Tournament.findById(team.tournamentId)
          .select("name date startTime type prize winnerTeamId")
          .lean()
      : null;

  const rounds = team.tournamentId
    ? await Round.find({ tournamentId: team.tournamentId, teamIds: team._id })
        .select("roundNumber name")
        .sort({ roundNumber: 1 })
        .lean()
    : [];

  const matchesPlayed = rounds.length;
  const bestRound = rounds.length
    ? (rounds[rounds.length - 1] as unknown as { roundNumber: number; name: string }).name
    : null;

  const champion =
    !!tournament &&
    ((tournament as unknown as { winnerTeamId?: mongoose.Types.ObjectId }).winnerTeamId?.toString() ?? "") ===
      team._id.toString();

  const pastTeams = team.captainId
    ? ((await Team.find({
        captainId: team.captainId,
        status: "approved",
        _id: { $ne: team._id },
      })
        .select("teamName createdAt tournamentId tournamentDate")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean()) as unknown as TeamDoc[])
    : [];

  const pastTournamentIds = Array.from(
    new Set(
      pastTeams
        .map((t) => t.tournamentId?.toString())
        .filter((x): x is string => typeof x === "string" && mongoose.Types.ObjectId.isValid(x))
    )
  );

  const pastTournaments = pastTournamentIds.length
    ? await Tournament.find({ _id: { $in: pastTournamentIds } })
        .select("name date startTime")
        .lean()
    : [];

  const pastTournamentById = new Map(
    (pastTournaments as unknown as { _id: mongoose.Types.ObjectId; name: string; date: string; startTime?: string }[]).map(
      (t) => [t._id.toString(), t]
    )
  );

  const tournamentLabel = tournament
    ? `${(tournament as unknown as { name: string }).name} · ${formatDateLabel(
        (tournament as unknown as { date: string }).date
      )}`
    : team.tournamentDate
      ? formatDateLabel(team.tournamentDate)
      : "—";

  return (
    <main className="page">
      <div className="page-inner">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/tournaments" className="back-link">
            ← Tournaments
          </Link>
          {team.tournamentId && (
            <Link href={`/tournaments/${team.tournamentId.toString()}/rounds`} className="back-link">
              ← Bracket
            </Link>
          )}
        </div>

        <header className="mb-6 flex flex-col gap-2 sm:mb-8">
          <h1 className="page-title break-words">{team.teamName}</h1>
          <p className="page-subtitle">
            {tournamentLabel}
            {champion && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                Champion
              </span>
            )}
          </p>
        </header>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <h2 className="section-title mb-4">Roster</h2>
            {team.players?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {team.players.map((p, idx) => (
                  <div
                    key={`${p.minecraftIGN}-${idx}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="font-medium text-slate-800 dark:text-slate-100 break-all">
                      {p.minecraftIGN}
                      {team.rewardReceiverIGN && p.minecraftIGN === team.rewardReceiverIGN && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          Rewards
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 break-all">
                      {p.discordUsername}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No players found.</p>
            )}
          </section>

          <aside className="card">
            <h2 className="section-title mb-4">Stats</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{formatDateTime(team.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Matches played</dt>
                <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{matchesPlayed}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Best round</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{bestRound ?? "—"}</dd>
              </div>
              {tournament && (
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Prize</dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                    {(tournament as unknown as { prize?: string }).prize ?? "—"}
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>

        {pastTeams.length > 0 && (
          <section className="mt-6 sm:mt-8">
            <div className="card">
              <h2 className="section-title mb-4">Past tournaments</h2>
              <ul className="space-y-3 text-sm">
                {pastTeams.map((t) => {
                  const tid = t.tournamentId?.toString() ?? "";
                  const tour = tid ? pastTournamentById.get(tid) : null;
                  const label = tour ? `${tour.name} · ${formatDateLabel(tour.date)}` : t.tournamentDate ? formatDateLabel(t.tournamentDate) : "—";
                  const href = tid ? `/tournaments/${tid}/teams/${t._id.toString()}` : null;
                  return (
                    <li
                      key={t._id.toString()}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 dark:text-slate-100 break-words">
                            {t.teamName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 break-words">{label}</div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {href ? (
                            <Link href={href} className="back-link">
                              View →
                            </Link>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}


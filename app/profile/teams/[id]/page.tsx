"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TournamentPopulated = { _id: string; name: string; date: string; teamSize: number; status?: string };
type UserPopulated = { _id: string; name?: string; displayName?: string; email?: string; image?: string; minecraftIGN?: string; discordUsername?: string };
type PlayerEntry = { userId?: UserPopulated; minecraftIGN: string; discordUsername: string };

type TeamDetail = {
  _id: string;
  teamName: string;
  status: string;
  rewardReceiverIGN: string;
  createdAt: string;
  captainId?: UserPopulated;
  players: PlayerEntry[];
  tournamentId?: TournamentPopulated;
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function displayName(user: UserPopulated | undefined) {
  if (!user) return "—";
  return (user.displayName && user.displayName.trim()) || user.name || "—";
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  approved: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  rejected: "bg-red-500/20 text-red-200 border-red-400/40",
};

export default function TeamDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated" || !id) return;
    let cancelled = false;
    fetch(`/api/users/me/teams/${id}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Team not found" : "Failed to load");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setTeam(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load team");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, status, router]);

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400">Loading team…</p>
        </div>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="card-glass rounded-2xl border-red-400/30 bg-red-500/10 p-6 dark:border-red-500/30 dark:bg-red-500/10">
            <p className="text-red-200">{error || "Team not found"}</p>
          </div>
          <p className="mt-6">
            <Link href="/profile" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
              ← Back to Profile
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const tournament = team.tournamentId as TournamentPopulated | undefined;
  const captain = team.captainId as UserPopulated | undefined;
  const players = (team.players || []) as PlayerEntry[];
  const currentUserId = (session?.user as { id?: string })?.id ?? "";
  const isCaptain = captain?._id === currentUserId;
  const registrationOpen = tournament?.status === "registration_open";
  const isSolo = tournament?.teamSize === 1;
  const canLeave = registrationOpen && (!isCaptain || isSolo);
  const tournamentId = tournament?._id;
  const statusStyle = statusColors[team.status] ?? "bg-slate-500/20 text-slate-200 border-slate-400/40";

  const handleLeave = async () => {
    if (!confirm("Leave this team? You will be removed from the roster.")) return;
    setActionMessage("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/me/teams/${id}/leave`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage(data.error ?? "Failed to leave");
        return;
      }
      setActionMessage(data.message ?? "You have left the team.");
      router.push("/profile");
    } catch {
      setActionMessage("Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePlayer = async (playerUserId: string) => {
    if (!confirm("Remove this player? You can send a new invite to replace them.")) return;
    setActionMessage("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/me/teams/${id}/players/${playerUserId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage(data.error ?? "Failed to remove");
        return;
      }
      setActionMessage(data.message ?? "Player removed.");
      const updated = await fetch(`/api/users/me/teams/${id}`, { cache: "no-store" }).then((r) => r.json());
      setTeam(updated);
    } catch {
      setActionMessage("Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferCaptain = async () => {
    if (!transferTarget || !confirm("Hand over captaincy to this player? They will be able to remove you or manage the team.")) return;
    setActionMessage("");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/me/teams/${id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCaptainUserId: transferTarget }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMessage(data.error ?? "Failed to transfer");
        return;
      }
      setActionMessage(data.message ?? "Captaincy transferred.");
      setTransferTarget("");
      const updated = await fetch(`/api/users/me/teams/${id}`, { cache: "no-store" }).then((r) => r.json());
      setTeam(updated);
    } catch {
      setActionMessage("Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const teammatesForTransfer = players.filter((p) => {
    const uid = (p.userId as UserPopulated | undefined)?._id;
    return uid && uid !== captain?._id;
  });

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 md:px-8 lg:py-8">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb / back */}
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/profile"
            className="font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            ← Profile
          </Link>
          <span className="text-slate-500 dark:text-slate-400">/</span>
          <span className="text-slate-600 dark:text-slate-300 truncate max-w-[180px] sm:max-w-none" title={team.teamName}>
            {team.teamName}
          </span>
        </nav>

        {/* Hero: team name + status + primary actions */}
        <header className="card-glass animate-fade-in mb-6 sm:mb-8 p-5 sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate sm:text-3xl md:text-4xl">
                {team.teamName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyle}`}>
                  {team.status}
                </span>
                {tournament && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {tournament.name}
                    {tournament.teamSize === 1 ? " (Solo)" : tournament.teamSize === 2 ? " (Duo)" : " (Squad)"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              {tournamentId && (
                <Link
                  href={`/tournaments/${tournamentId}/rounds`}
                  className="btn-gradient inline-flex items-center px-5 py-2.5 text-sm"
                >
                  View rounds & matches
                </Link>
              )}
              <Link
                href="/matches"
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white/15 dark:text-slate-200 dark:hover:bg-white/15"
              >
                My matches
              </Link>
            </div>
          </div>
        </header>

        {actionMessage && (
          <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            {actionMessage}
          </div>
        )}

        {/* Info grid: 1 col mobile, 2 col lg */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Team & status */}
          <section className="card-glass animate-fade-in p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Team & status
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Team name</dt>
                <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{team.teamName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</dt>
                <dd className="mt-0.5 capitalize text-slate-800 dark:text-slate-200">{team.status}</dd>
              </div>
            </dl>
            {registrationOpen && (
              <div className="mt-5 pt-4 border-t border-white/10">
                {canLeave ? (
                  <button
                    type="button"
                    onClick={handleLeave}
                    disabled={actionLoading}
                    className="rounded-full border border-red-400/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-60 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                  >
                    {actionLoading ? (isSolo ? "Withdrawing…" : "Leaving…") : isSolo ? "Withdraw registration" : "Leave team"}
                  </button>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    As captain you cannot leave. Remove a player to replace them, or ask an admin to disband the team.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Tournament */}
          <section className="card-glass animate-fade-in p-5 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tournament
            </h2>
            {tournament ? (
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Name</dt>
                  <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{tournament.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{formatDate(tournament.date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Team size</dt>
                  <dd className="mt-0.5 text-slate-800 dark:text-slate-200">
                    {tournament.teamSize} player{tournament.teamSize !== 1 ? "s" : ""}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Tournament info not available</p>
            )}
            {tournamentId && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <Link
                  href={`/tournaments/${tournamentId}/rounds`}
                  className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Open tournament rounds →
                </Link>
              </div>
            )}
          </section>

          {/* Registration details */}
          <section className="card-glass animate-fade-in p-5 sm:p-6 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registration details
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered on</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{formatDate(team.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Reward receiver (IGN)</dt>
                <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{team.rewardReceiverIGN || "—"}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Captain */}
        <section className="card-glass animate-fade-in mt-4 sm:mt-6 p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Captain
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            {captain?.image ? (
              <img src={captain.image} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-600/40 text-lg font-semibold text-slate-300">
                {(displayName(captain) || "?")[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-slate-800 dark:text-slate-200">{displayName(captain)}</p>
              {captain?.email && (
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{captain.email}</p>
              )}
            </div>
          </div>
          {isCaptain && registrationOpen && teammatesForTransfer.length > 0 && (
            <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Transfer captaincy</p>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Hand the team over to another player. They will become captain.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                <select
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 max-w-xs"
                >
                  <option value="">Select player…</option>
                  {teammatesForTransfer.map((p) => {
                    const u = p.userId as UserPopulated | undefined;
                    return (
                      <option key={u?._id} value={u?._id ?? ""}>
                        {displayName(u)}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={handleTransferCaptain}
                  disabled={actionLoading || !transferTarget}
                  className="btn-gradient inline-flex w-fit px-4 py-2 text-sm"
                >
                  {actionLoading ? "Transferring…" : "Transfer captaincy"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Roster */}
        <section className="card-glass animate-fade-in mt-4 sm:mt-6 p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Roster ({players.length})
          </h2>
          <ul className="space-y-3">
            {players.map((p, idx) => {
              const user = p.userId as UserPopulated | undefined;
              const playerUserId = user?._id;
              const isCaptainPlayer = playerUserId === captain?._id;
              const isRewardReceiver = (p.minecraftIGN || "").trim() === (team.rewardReceiverIGN || "").trim();
              const canRemove = isCaptain && registrationOpen && playerUserId && !isCaptainPlayer;
              return (
                <li
                  key={idx}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {user?.image ? (
                      <img src={user.image} alt="" className="h-11 w-11 flex-shrink-0 rounded-full object-cover ring-2 ring-white/10" />
                    ) : (
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-600/40 text-sm font-semibold text-slate-300">
                        {(displayName(user) || "?")[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {displayName(user)}
                        </p>
                        {isCaptainPlayer && (
                          <span className="rounded bg-slate-500/25 px-1.5 py-0.5 text-xs font-medium text-slate-200">
                            Captain
                          </span>
                        )}
                        {isRewardReceiver && !isCaptainPlayer && (
                          <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-xs font-medium text-amber-200">
                            Reward
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-400">IGN</span> {p.minecraftIGN || "—"}
                        <span className="mx-2 text-slate-600">·</span>
                        <span className="font-medium text-slate-400">Discord</span> {p.discordUsername || "—"}
                      </p>
                    </div>
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemovePlayer(playerUserId)}
                      disabled={actionLoading}
                      className="rounded-full border border-red-400/50 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-500/20 sm:self-center"
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {isCaptain && registrationOpen && players.length > 1 && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              To replace someone: remove them above, then go to Tournaments → this tournament → same team name, and send an invite to the new player.
            </p>
          )}
        </section>

        <p className="mt-8">
          <Link href="/profile" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
            ← Back to Profile
          </Link>
        </p>
      </div>
    </main>
  );
}

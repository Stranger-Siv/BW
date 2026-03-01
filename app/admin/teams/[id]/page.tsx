"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminTeamDetailSkeleton } from "@/components/admin/AdminSkeletons";
import { ChangeDateModal, type TournamentOption } from "@/components/admin/ChangeDateModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { PlayerRow } from "@/components/registration/PlayerRow";
import { RewardReceiverSelect } from "@/components/registration/RewardReceiverSelect";
import { formatDateLabel } from "@/lib/formatDate";

type TournamentPopulated = {
  _id: string;
  name: string;
  date: string;
  status?: string;
  teamSize?: number;
  maxTeams?: number;
  registeredTeams?: number;
  isClosed?: boolean;
};

type AdminTeamDetail = {
  _id: string;
  teamName: string;
  status: string;
  rewardReceiverIGN: string;
  createdAt: string;
  tournamentDate?: string;
  tournamentId?: TournamentPopulated | string | null;
  players: { minecraftIGN: string; discordUsername: string }[];
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  approved: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  rejected: "bg-red-500/20 text-red-200 border-red-400/40",
};

export default function AdminTeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [team, setTeam] = useState<AdminTeamDetail | null>(null);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [changeDateOpen, setChangeDateOpen] = useState(false);
  const [changeDateValue, setChangeDateValue] = useState("");
  const [changeDateLoading, setChangeDateLoading] = useState(false);
  const [changeDateError, setChangeDateError] = useState<string | null>(null);

  const [disbandOpen, setDisbandOpen] = useState(false);
  const [disbandLoading, setDisbandLoading] = useState(false);

  const [editPlayers, setEditPlayers] = useState<{ minecraftIGN: string; discordUsername: string }[]>([]);
  const [editRewardReceiver, setEditRewardReceiver] = useState("");
  const [editSaveLoading, setEditSaveLoading] = useState(false);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/team/${id}`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) throw new Error("Team not found");
      throw new Error("Failed to load team");
    }
    return res.json();
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Invalid team ID");
      return;
    }
    setLoading(true);
    setError(null);
    fetchTeam()
      .then((data) => {
        setTeam(data);
        setEditPlayers((data?.players ?? []).map((p: { minecraftIGN?: string; discordUsername?: string }) => ({ minecraftIGN: p.minecraftIGN ?? "", discordUsername: p.discordUsername ?? "" })));
        setEditRewardReceiver(data?.rewardReceiverIGN ?? "");
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, fetchTeam]);

  useEffect(() => {
    if (team) {
      setEditPlayers((team.players ?? []).map((p) => ({ minecraftIGN: p.minecraftIGN ?? "", discordUsername: p.discordUsername ?? "" })));
      setEditRewardReceiver(team.rewardReceiverIGN ?? "");
    }
  }, [team]);

  useEffect(() => {
    fetch("/api/admin/tournaments", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { _id: string; name: string; date: string; maxTeams: number; registeredTeams: number; isClosed: boolean }[]) => {
        setTournaments(
          Array.isArray(list)
            ? list.map((t) => ({
                _id: t._id,
                name: t.name,
                date: t.date,
                maxTeams: t.maxTeams,
                registeredTeams: t.registeredTeams ?? 0,
                isClosed: t.isClosed ?? false,
              }))
            : []
        );
      })
      .catch(() => {});
  }, []);

  const tournament = team?.tournamentId && typeof team.tournamentId === "object" ? team.tournamentId : null;
  const tournamentIdStr = tournament && "_id" in tournament ? tournament._id : null;
  const currentTournamentId = tournamentIdStr ?? null;

  const tournamentOptions: TournamentOption[] = tournaments;

  const handleApprove = useCallback(async () => {
    if (!team) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/team/${team._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to approve");
      setTeam((prev) => (prev ? { ...prev, status: "approved" } : null));
      setActionMessage("Team approved.");
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }, [team]);

  const handleReject = useCallback(async () => {
    if (!team) return;
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/team/${team._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to reject");
      setTeam((prev) => (prev ? { ...prev, status: "rejected" } : null));
      setActionMessage("Team rejected.");
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }, [team]);

  const openChangeDate = useCallback(() => {
    setChangeDateValue("");
    setChangeDateError(null);
    setChangeDateOpen(true);
  }, []);

  const handleChangeDateConfirm = useCallback(async () => {
    if (!team || !changeDateValue) return;
    setChangeDateLoading(true);
    setChangeDateError(null);
    try {
      const res = await fetch(`/api/admin/team/${team._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: changeDateValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to move team");
      setChangeDateOpen(false);
      const updated = await fetchTeam();
      setTeam(updated);
      setActionMessage("Team moved to new tournament.");
    } catch (e) {
      setChangeDateError(e instanceof Error ? e.message : "Failed to move team");
    } finally {
      setChangeDateLoading(false);
    }
  }, [team, changeDateValue, fetchTeam]);

  const openDisband = useCallback(() => {
    setDisbandOpen(true);
  }, []);

  const handleDisbandConfirm = useCallback(async () => {
    if (!team) return;
    setDisbandLoading(true);
    try {
      const res = await fetch(`/api/admin/team/${team._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to disband");
      setDisbandOpen(false);
      router.push("/admin");
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Failed to disband");
    } finally {
      setDisbandLoading(false);
    }
  }, [team, router]);

  const handleSavePlayers = useCallback(async () => {
    if (!team) return;
    const igns = editPlayers.map((p) => p.minecraftIGN.trim()).filter(Boolean);
    if (!igns.includes(editRewardReceiver.trim())) {
      setEditSaveError("Reward receiver must be one of the players' Minecraft IGN");
      return;
    }
    setEditSaveLoading(true);
    setEditSaveError(null);
    try {
      const res = await fetch(`/api/admin/team/${team._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: editPlayers.map((p) => ({ minecraftIGN: p.minecraftIGN.trim(), discordUsername: p.discordUsername.trim() })),
          rewardReceiverIGN: editRewardReceiver.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setTeam(data);
      setActionMessage("Team members updated.");
    } catch (e) {
      setEditSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditSaveLoading(false);
    }
  }, [team, editPlayers, editRewardReceiver]);

  if (loading) {
    return <AdminTeamDetailSkeleton />;
  }

  if (error || !team) {
    return (
      <main className="page">
        <div className="page-inner-narrow">
          <div className="alert-error">
            <p>{error || "Team not found"}</p>
          </div>
          <p className="mt-6">
            <Link href="/admin" className="back-link text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300">
              ← Back to Admin
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const statusStyle = statusStyles[team.status] ?? "bg-slate-500/20 text-slate-200 border-slate-400/40";
  const tournamentName = tournament && "name" in tournament ? tournament.name : "";
  const tournamentDate = tournament && "date" in tournament ? tournament.date : team.tournamentDate ?? "";

  return (
    <main className="min-h-screen pb-bottom-nav px-4 py-6 sm:px-6 md:px-8 lg:py-8">
      <div className="mx-auto max-w-4xl">
        <AdminBreadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Team", href: "/admin" },
            { label: team.teamName },
          ]}
          className="mb-4"
        />

        <header className="card-glass animate-fade-in mb-6 p-4 sm:mb-8 sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate sm:text-2xl md:text-3xl lg:text-4xl">
                {team.teamName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyle}`}>
                  {team.status}
                </span>
                {tournamentName && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {tournamentName}
                    {tournament && "teamSize" in tournament && tournament.teamSize === 1
                      ? " (Solo)"
                      : tournament && "teamSize" in tournament && tournament.teamSize === 2
                        ? " (Duo)"
                        : " (Squad)"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              {tournamentIdStr && (
                <Link
                  href={`/admin/tournaments/${tournamentIdStr}/rounds`}
                  className="min-h-[44px] flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white/15 dark:text-slate-200 dark:hover:bg-white/15"
                >
                  Tournament rounds
                </Link>
            )}
            </div>
          </div>
        </header>

        {actionMessage && (
          <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            {actionMessage}
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <section className="card-glass animate-fade-in p-4 sm:p-6">
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
            <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-white/10">
              {team.status !== "approved" && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="min-h-[44px] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:opacity-90 disabled:opacity-60"
                >
                  Approve
                </button>
              )}
              {team.status !== "rejected" && (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="min-h-[44px] rounded-full border border-amber-400/50 bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/30 disabled:opacity-60 dark:text-amber-300"
                >
                  Reject
                </button>
              )}
              <button
                type="button"
                onClick={openChangeDate}
                disabled={actionLoading}
                className="min-h-[44px] rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/15 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-white/15"
              >
                Move to another tournament
              </button>
              <button
                type="button"
                onClick={openDisband}
                disabled={actionLoading}
                className="min-h-[44px] rounded-full border border-red-400/50 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/30 disabled:opacity-60 dark:text-red-300"
              >
                Disband team
              </button>
            </div>
          </section>

          <section className="card-glass animate-fade-in p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tournament
            </h2>
            {tournamentName || tournamentDate ? (
              <dl className="space-y-3">
                {tournamentName && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Name</dt>
                    <dd className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{tournamentName}</dd>
                  </div>
                )}
                {tournamentDate && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</dt>
                    <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{formatDateLabel(tournamentDate)}</dd>
                  </div>
                )}
                {tournament && "teamSize" in tournament && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Team size</dt>
                    <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{tournament.teamSize} player(s)</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No tournament linked</p>
            )}
            {tournamentIdStr && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <Link
                  href={`/admin/tournaments/${tournamentIdStr}/rounds`}
                  className="text-sm font-medium text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Open tournament rounds →
                </Link>
              </div>
            )}
          </section>

          <section className="card-glass animate-fade-in p-4 sm:p-6 lg:col-span-2">
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

        <section className="card-glass animate-fade-in mt-4 sm:mt-6 p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Roster ({team.players?.length ?? 0})
          </h2>
          {team.status === "pending" ? (
            <div className="space-y-6">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Edit player details before approving. Changes are saved when you click Save.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                {editPlayers.map((player, idx) => (
                  <PlayerRow
                    key={idx}
                    index={idx}
                    minecraftIGN={player.minecraftIGN}
                    discordUsername={player.discordUsername}
                    onIGNChange={(v) => setEditPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, minecraftIGN: v } : p)))}
                    onDiscordChange={(v) => setEditPlayers((prev) => prev.map((p, i) => (i === idx ? { ...p, discordUsername: v } : p)))}
                  />
                ))}
              </div>
              <div>
                <label htmlFor="admin-reward-receiver" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                  Reward receiver (Minecraft IGN)
                </label>
                <RewardReceiverSelect
                  id="admin-reward-receiver"
                  igns={editPlayers.map((p) => p.minecraftIGN.trim()).filter(Boolean)}
                  value={editRewardReceiver}
                  onChange={setEditRewardReceiver}
                  disabled={editPlayers.every((p) => !p.minecraftIGN.trim())}
                />
              </div>
              {editSaveError && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
                  {editSaveError}
                </div>
              )}
              <button
                type="button"
                onClick={handleSavePlayers}
                disabled={editSaveLoading}
                className="min-h-[44px] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:opacity-90 disabled:opacity-60"
              >
                {editSaveLoading ? "Saving…" : "Save changes"}
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {(team.players ?? []).map((p, idx) => {
                const isReward = (p.minecraftIGN || "").trim() === (team.rewardReceiverIGN || "").trim();
                return (
                  <li
                    key={idx}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{p.minecraftIGN || "—"}</p>
                        {isReward && (
                          <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-xs font-medium text-amber-200">
                            Reward
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        Discord: {p.discordUsername || "—"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-8">
          <Link href="/admin" className="text-sm font-medium text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300">
            ← Back to Admin
          </Link>
        </p>
      </div>

      <ChangeDateModal
        open={changeDateOpen}
        teamName={team.teamName}
        currentDate={tournamentDate}
        dates={[]}
        selectedDate=""
        onSelectDate={() => {}}
        onConfirm={handleChangeDateConfirm}
        onCancel={() => setChangeDateOpen(false)}
        loading={changeDateLoading}
        error={changeDateError}
        tournaments={tournamentOptions}
        currentTournamentId={currentTournamentId}
        selectedTournamentId={changeDateValue}
        onSelectTournamentId={setChangeDateValue}
      />

      <ConfirmModal
        open={disbandOpen}
        title="Disband team"
        message={`Permanently disband "${team.teamName}"? The team will be removed and the tournament slot freed. This cannot be undone.`}
        confirmLabel="Disband team"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDisbandConfirm}
        onCancel={() => setDisbandOpen(false)}
        loading={disbandLoading}
      />
    </main>
  );
}

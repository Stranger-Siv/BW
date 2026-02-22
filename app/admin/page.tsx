"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateLabel } from "@/lib/formatDate";
import { ChangeDateModal, type TournamentOption } from "@/components/admin/ChangeDateModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { StatsCards } from "@/components/admin/StatsCards";
import { TeamsCards } from "@/components/admin/TeamsCards";
import { TeamsTable, type AdminTeam } from "@/components/admin/TeamsTable";
import { PlayerRow } from "@/components/registration/PlayerRow";
import { RewardReceiverSelect } from "@/components/registration/RewardReceiverSelect";
import type { IPlayer } from "@/models/Team";

function getInitialPlayers(count: number): IPlayer[] {
  return Array.from({ length: count }, () => ({ minecraftIGN: "", discordUsername: "" }));
}

type TournamentDoc = {
  _id: string;
  name: string;
  date: string;
  startTime?: string;
  maxTeams: number;
  teamSize: number;
  registeredTeams: number;
  status: string;
  isClosed: boolean;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [changeDateTeam, setChangeDateTeam] = useState<AdminTeam | null>(null);
  const [changeDateValue, setChangeDateValue] = useState("");
  const [changeDateLoading, setChangeDateLoading] = useState(false);
  const [changeDateError, setChangeDateError] = useState<string | null>(null);

  const [disbandTeam, setDisbandTeam] = useState<AdminTeam | null>(null);
  const [disbandLoading, setDisbandLoading] = useState(false);

  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDisbandTeams, setBulkDisbandTeams] = useState<AdminTeam[] | null>(null);
  const [bulkDisbandLoading, setBulkDisbandLoading] = useState(false);

  const [addTeamName, setAddTeamName] = useState("");
  const [addTeamPlayers, setAddTeamPlayers] = useState<IPlayer[]>([]);
  const [addTeamRewardReceiver, setAddTeamRewardReceiver] = useState("");
  const [addTeamLoading, setAddTeamLoading] = useState(false);
  const [addTeamError, setAddTeamError] = useState<string | null>(null);
  const [addTeamSuccess, setAddTeamSuccess] = useState<string | null>(null);
  const [addTeamPlayerErrors, setAddTeamPlayerErrors] = useState<Record<number, string>>({});
  const [addTeamPlayersCheckLoading, setAddTeamPlayersCheckLoading] = useState(false);

  const selectedTournament = tournaments.find((t) => t._id === selectedTournamentId);

  const fetchTournaments = useCallback(async () => {
    setTournamentsLoading(true);
    try {
      const res = await fetch("/api/admin/tournaments");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load tournaments");
      }
      const data = await res.json();
      setTournaments(Array.isArray(data) ? data : []);
    } catch (e) {
      setTournaments([]);
    } finally {
      setTournamentsLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async (tournamentId: string) => {
    if (!tournamentId.trim()) {
      setTeams([]);
      return;
    }
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const res = await fetch(`/api/admin/teams?tournamentId=${encodeURIComponent(tournamentId)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load teams");
      }
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (e) {
      setTeamsError(e instanceof Error ? e.message : "Failed to load teams");
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  useEffect(() => {
    if (selectedTournamentId) {
      fetchTeams(selectedTournamentId);
    } else {
      setTeams([]);
      setTeamsError(null);
    }
  }, [selectedTournamentId, fetchTeams]);

  useEffect(() => {
    if (selectedTournament) {
      setAddTeamPlayers(getInitialPlayers(selectedTournament.teamSize));
      setAddTeamName("");
      setAddTeamRewardReceiver("");
      setAddTeamError(null);
      setAddTeamSuccess(null);
      setAddTeamPlayerErrors({});
      setSelectedTeamIds(new Set());
    }
  }, [selectedTournamentId, selectedTournament?.teamSize]);

  useEffect(() => {
    if (!selectedTournamentId || !selectedTournament) {
      setAddTeamPlayerErrors({});
      return;
    }
    const hasAnyFilled = addTeamPlayers.some(
      (p) => (p.minecraftIGN ?? "").trim() && (p.discordUsername ?? "").trim()
    );
    if (!hasAnyFilled) {
      setAddTeamPlayerErrors({});
      return;
    }
    const timer = setTimeout(() => {
      setAddTeamPlayersCheckLoading(true);
      fetch(`/api/tournaments/${selectedTournamentId}/check-players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players: addTeamPlayers.map((p) => ({
            minecraftIGN: (p.minecraftIGN ?? "").trim(),
            discordUsername: (p.discordUsername ?? "").trim(),
          })),
        }),
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data: { taken?: { index: number }[] }) => {
          const next: Record<number, string> = {};
          for (const t of data.taken ?? []) {
            next[t.index] = "This player is already on another team in this tournament.";
          }
          setAddTeamPlayerErrors(next);
        })
        .catch(() => setAddTeamPlayerErrors({}))
        .finally(() => setAddTeamPlayersCheckLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedTournamentId, selectedTournament, addTeamPlayers]);

  const refetch = useCallback(() => {
    if (selectedTournamentId) fetchTeams(selectedTournamentId);
    fetchTournaments();
  }, [selectedTournamentId, fetchTeams, fetchTournaments]);

  const handleApprove = useCallback(
    async (team: AdminTeam) => {
      setActionLoadingId(team._id);
      setActionError(null);
      try {
        const res = await fetch(`/api/admin/team/${team._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to approve");
        refetch();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setActionLoadingId(null);
      }
    },
    [refetch]
  );

  const handleReject = useCallback(
    async (team: AdminTeam) => {
      setActionLoadingId(team._id);
      setActionError(null);
      try {
        const res = await fetch(`/api/admin/team/${team._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "rejected" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to reject");
        refetch();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setActionLoadingId(null);
      }
    },
    [refetch]
  );

  const openChangeDate = useCallback((team: AdminTeam) => {
    setChangeDateTeam(team);
    setChangeDateValue("");
    setChangeDateError(null);
  }, []);

  const handleChangeDateConfirm = useCallback(async () => {
    if (!changeDateTeam || !changeDateValue) return;
    setChangeDateLoading(true);
    setChangeDateError(null);
    try {
      const body = selectedTournamentId
        ? { tournamentId: changeDateValue }
        : { tournamentDate: changeDateValue };
      const res = await fetch(`/api/admin/team/${changeDateTeam._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to move team");
      setChangeDateTeam(null);
      refetch();
    } catch (e) {
      setChangeDateError(e instanceof Error ? e.message : "Failed to move team");
    } finally {
      setChangeDateLoading(false);
    }
  }, [changeDateTeam, changeDateValue, selectedTournamentId, refetch]);

  const openDisband = useCallback((team: AdminTeam) => {
    setDisbandTeam(team);
  }, []);

  const toggleTeamSelection = useCallback((id: string) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllTeams = useCallback(
    (checked: boolean) => {
      if (checked) setSelectedTeamIds(new Set(teams.map((t) => t._id)));
      else setSelectedTeamIds(new Set());
    },
    [teams]
  );

  const selectedTeams = useMemo(
    () => teams.filter((t) => selectedTeamIds.has(t._id)),
    [teams, selectedTeamIds]
  );

  const bulkApprove = useCallback(async () => {
    const ids = selectedTeams.filter((t) => t.status !== "approved").map((t) => t._id);
    if (ids.length === 0) return;
    setBulkLoading(true);
    setActionError(null);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/team/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
          }).then((r) => ({ ok: r.ok, id }))
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) setActionError(`Approve failed for ${failed.length} team(s).`);
      else {
        setSelectedTeamIds(new Set());
        refetch();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Bulk approve failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedTeams, refetch]);

  const bulkReject = useCallback(async () => {
    const ids = selectedTeams.filter((t) => t.status !== "rejected").map((t) => t._id);
    if (ids.length === 0) return;
    setBulkLoading(true);
    setActionError(null);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/team/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "rejected" }),
          }).then((r) => ({ ok: r.ok, id }))
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) setActionError(`Reject failed for ${failed.length} team(s).`);
      else {
        setSelectedTeamIds(new Set());
        refetch();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Bulk reject failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedTeams, refetch]);

  const openBulkDisband = useCallback(() => {
    if (selectedTeams.length === 0) return;
    setBulkDisbandTeams(selectedTeams);
  }, [selectedTeams]);

  const handleBulkDisbandConfirm = useCallback(async () => {
    if (!bulkDisbandTeams?.length) return;
    setBulkDisbandLoading(true);
    setActionError(null);
    try {
      const results = await Promise.all(
        bulkDisbandTeams.map((t) =>
          fetch(`/api/admin/team/${t._id}`, { method: "DELETE" }).then((r) => ({ ok: r.ok, id: t._id }))
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) setActionError(`Disband failed for ${failed.length} team(s).`);
      else {
        setBulkDisbandTeams(null);
        setSelectedTeamIds(new Set());
        refetch();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Bulk disband failed");
    } finally {
      setBulkDisbandLoading(false);
    }
  }, [bulkDisbandTeams, refetch]);

  const handleDisbandConfirm = useCallback(async () => {
    if (!disbandTeam) return;
    setDisbandLoading(true);
    try {
      const res = await fetch(`/api/admin/team/${disbandTeam._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to disband");
      setDisbandTeam(null);
      refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to disband");
    } finally {
      setDisbandLoading(false);
    }
  }, [disbandTeam, refetch]);

  const updateAddTeamPlayer = useCallback((index: number, field: "minecraftIGN" | "discordUsername", value: string) => {
    setAddTeamPlayers((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addTeamRewardOptions = useMemo(
    () => addTeamPlayers.map((p) => (p.minecraftIGN ?? "").trim()).filter(Boolean),
    [addTeamPlayers]
  );

  const handleAddTeam = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTournamentId || !selectedTournament) return;
      setAddTeamError(null);
      setAddTeamSuccess(null);
      const required = selectedTournament.teamSize;
      if (!addTeamName.trim()) {
        setAddTeamError("Team name is required.");
        return;
      }
      if (Object.keys(addTeamPlayerErrors).length > 0) {
        setAddTeamError("One or more players are already on another team in this tournament.");
        return;
      }
      if (addTeamPlayers.length !== required) {
        setAddTeamError(`Exactly ${required} player(s) required.`);
        return;
      }
      for (let i = 0; i < addTeamPlayers.length; i++) {
        if (!addTeamPlayers[i].minecraftIGN?.trim() || !addTeamPlayers[i].discordUsername?.trim()) {
          setAddTeamError(`Player ${i + 1}: Minecraft IGN and Discord are required.`);
          return;
        }
      }
      if (!addTeamRewardOptions.includes(addTeamRewardReceiver.trim())) {
        setAddTeamError("Select a reward receiver from the players listed.");
        return;
      }
      setAddTeamLoading(true);
      try {
        const res = await fetch(`/api/admin/tournaments/${selectedTournamentId}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamName: addTeamName.trim(),
            players: addTeamPlayers.map((p) => ({
              minecraftIGN: (p.minecraftIGN ?? "").trim(),
              discordUsername: (p.discordUsername ?? "").trim(),
            })),
            rewardReceiverIGN: addTeamRewardReceiver.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to add team");
        setAddTeamSuccess("Team added.");
        setAddTeamName("");
        setAddTeamPlayers(getInitialPlayers(selectedTournament.teamSize));
        setAddTeamRewardReceiver("");
        refetch();
      } catch (e) {
        setAddTeamError(e instanceof Error ? e.message : "Failed to add team");
      } finally {
        setAddTeamLoading(false);
      }
    },
    [selectedTournamentId, selectedTournament, addTeamName, addTeamPlayers, addTeamRewardReceiver, addTeamRewardOptions, addTeamPlayerErrors, refetch]
  );

  const tournamentOptionsForModal: TournamentOption[] = tournaments.map((t) => ({
    _id: t._id,
    name: t.name,
    date: t.date,
    maxTeams: t.maxTeams,
    registeredTeams: t.registeredTeams,
    isClosed: t.isClosed,
  }));

  return (
    <main className="page">
      <div className="page-inner-wide">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
          <h1 className="page-title">Admin Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3">
            {isSuperAdmin && (
              <Link
                href="/admin/users"
                className="min-h-[44px] flex items-center rounded-full border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/30 dark:text-amber-300"
              >
                Manage users
              </Link>
            )}
            <Link
              href="/admin/tournaments"
              className="btn-gradient min-h-[44px] flex items-center"
            >
              Manage tournaments
            </Link>
            <Link href="/tournaments" className="back-link min-h-[44px] flex items-center">
              ← Tournaments
            </Link>
          </div>
        </header>

        <div className="card mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create and edit tournaments, then come back here to view teams and manage registrations.
          </p>
          <Link href="/admin/tournaments" className="back-link mt-3 inline-flex items-center gap-1.5">
            Go to Tournaments page →
          </Link>
        </div>

        <div className="card-lg shadow-lg">
          <h2 className="section-title mb-4 !normal-case !text-xl text-slate-800 dark:text-slate-100 md:!text-2xl">
            Registrations by tournament
          </h2>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
              Select tournament
            </label>
            {tournamentsLoading ? (
              <div className="flex h-12 items-center gap-2 text-slate-500 dark:text-slate-400">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                Loading tournaments…
              </div>
            ) : (
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="input-glass w-full max-w-md min-h-[48px] rounded-xl sm:min-h-0"
              >
                <option value="">Choose a tournament</option>
                {tournaments.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} — {formatDateLabel(t.date)} ({t.registeredTeams}/{t.maxTeams})
                    {t.isClosed ? " — Closed" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!tournamentsLoading && tournaments.length === 0 && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              No tournaments yet. Create one from the Tournaments page.
            </p>
          )}

          {!selectedTournamentId && !tournamentsLoading && tournaments.length > 0 && (
            <div className="card-glass mt-6 py-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                Select a tournament above to view teams, stats, and actions.
              </p>
            </div>
          )}

          {actionError && (
            <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
              {actionError}
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="ml-2 font-medium underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {selectedTournament && (
            <>
              <div className="mt-6">
                <StatsCards
                  totalTeams={selectedTournament.registeredTeams}
                  maxSlots={selectedTournament.maxTeams}
                  remainingSlots={Math.max(
                    0,
                    selectedTournament.maxTeams - selectedTournament.registeredTeams
                  )}
                  isClosed={selectedTournament.isClosed}
                />
              </div>

              {!selectedTournament.isClosed &&
                selectedTournament.registeredTeams < selectedTournament.maxTeams && (
                  <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 p-5 dark:border-white/10 dark:bg-white/5 sm:p-6 md:p-8">
                    <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100 sm:mb-5">
                      Add team manually
                    </h3>
                    <p className="mb-4 text-sm text-slate-500 dark:text-slate-400 sm:mb-5">
                      Add a staff or guest team. Team name must be unique; each player (IGN + Discord) can only be in one team for this tournament.
                    </p>
                    <form onSubmit={handleAddTeam} className="flex w-full flex-col gap-6">
                      <div className="w-full">
                        <label htmlFor="admin-team-name" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                          Team name
                        </label>
                        <input
                          id="admin-team-name"
                          type="text"
                          value={addTeamName}
                          onChange={(e) => setAddTeamName(e.target.value)}
                          placeholder="e.g. Staff Team"
                          className="w-full min-h-[48px] rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-slate-800 placeholder-slate-500 transition-all duration-200 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500 sm:min-h-[44px] sm:py-2.5"
                        />
                      </div>
                      <div className="w-full">
                        <h4 className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                          Players (Minecraft IGN & Discord)
                        </h4>
                        {addTeamPlayersCheckLoading && addTeamPlayers.some((p) => (p.minecraftIGN ?? "").trim() && (p.discordUsername ?? "").trim()) && (
                          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                            Checking if any player is already on a team…
                          </p>
                        )}
                        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                          {addTeamPlayers.map((player, idx) => (
                            <PlayerRow
                              key={idx}
                              index={idx}
                              minecraftIGN={player.minecraftIGN}
                              discordUsername={player.discordUsername}
                              onIGNChange={(v) => updateAddTeamPlayer(idx, "minecraftIGN", v)}
                              onDiscordChange={(v) => updateAddTeamPlayer(idx, "discordUsername", v)}
                              error={addTeamPlayerErrors[idx]}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="w-full">
                        <label htmlFor="admin-reward-receiver" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                          Reward receiver
                        </label>
                        <RewardReceiverSelect
                          id="admin-reward-receiver"
                          igns={addTeamRewardOptions}
                          value={addTeamRewardReceiver}
                          onChange={setAddTeamRewardReceiver}
                          disabled={addTeamRewardOptions.length === 0}
                        />
                      </div>
                      {addTeamError && (
                        <div className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
                          {addTeamError}
                        </div>
                      )}
                      {addTeamSuccess && (
                        <div className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                          {addTeamSuccess}
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={addTeamLoading || Object.keys(addTeamPlayerErrors).length > 0}
                        className="btn-gradient w-full py-3 sm:w-auto sm:min-w-[220px]"
                      >
                        {addTeamLoading ? "Adding…" : "Add team"}
                      </button>
                    </form>
                  </div>
                )}

              {teamsError && (
                <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
                  {teamsError}
                </div>
              )}

              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Registered teams
                  </h3>
                  {selectedTeamIds.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedTeamIds.size} selected
                      </span>
                      <button
                        type="button"
                        onClick={bulkApprove}
                        disabled={bulkLoading || selectedTeams.every((t) => t.status === "approved")}
                        className="min-h-[36px] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:opacity-90 disabled:opacity-50"
                      >
                        {bulkLoading ? "Processing…" : "Approve selected"}
                      </button>
                      <button
                        type="button"
                        onClick={bulkReject}
                        disabled={bulkLoading || selectedTeams.every((t) => t.status === "rejected")}
                        className="min-h-[36px] rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/30 disabled:opacity-50 dark:text-amber-300"
                      >
                        {bulkLoading ? "Processing…" : "Reject selected"}
                      </button>
                      <button
                        type="button"
                        onClick={openBulkDisband}
                        disabled={bulkLoading}
                        className="min-h-[36px] rounded-full border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/30 disabled:opacity-50 dark:text-red-300"
                      >
                        Disband selected
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamIds(new Set())}
                        className="min-h-[36px] rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white/15 dark:text-slate-500 dark:hover:bg-white/15"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}
                </div>
                {teamsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-slate-500 dark:text-slate-400">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <span>Loading teams…</span>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block">
                      <TeamsTable
                        teams={teams}
                        selectedIds={selectedTeamIds}
                        onToggleSelect={toggleTeamSelection}
                        onToggleSelectAll={toggleSelectAllTeams}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onChangeDate={openChangeDate}
                        onDisband={openDisband}
                        actionLoadingId={actionLoadingId}
                        bulkLoading={bulkLoading}
                      />
                    </div>
                    <div className="md:hidden">
                      <TeamsCards
                        teams={teams}
                        selectedIds={selectedTeamIds}
                        onToggleSelect={toggleTeamSelection}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onChangeDate={openChangeDate}
                        onDisband={openDisband}
                        actionLoadingId={actionLoadingId}
                        bulkLoading={bulkLoading}
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ChangeDateModal
        open={!!changeDateTeam}
        teamName={changeDateTeam?.teamName ?? ""}
        currentDate={changeDateTeam?.tournamentDate ?? ""}
        dates={[]}
        selectedDate={changeDateValue}
        onSelectDate={setChangeDateValue}
        onConfirm={handleChangeDateConfirm}
        onCancel={() => {
          setChangeDateTeam(null);
          setChangeDateError(null);
        }}
        loading={changeDateLoading}
        error={changeDateError}
        tournaments={tournamentOptionsForModal}
        currentTournamentId={selectedTournamentId || null}
        selectedTournamentId={changeDateValue}
        onSelectTournamentId={setChangeDateValue}
      />

      <ConfirmModal
        open={!!disbandTeam}
        title="Disband team"
        message={
          disbandTeam
            ? `Are you sure you want to disband "${disbandTeam.teamName}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Disband"
        variant="danger"
        onConfirm={handleDisbandConfirm}
        onCancel={() => setDisbandTeam(null)}
        loading={disbandLoading}
      />

      <ConfirmModal
        open={!!bulkDisbandTeams?.length}
        title="Disband selected teams"
        message={
          bulkDisbandTeams?.length
            ? `Are you sure you want to disband ${bulkDisbandTeams.length} team${bulkDisbandTeams.length !== 1 ? "s" : ""}? This cannot be undone.`
            : ""
        }
        confirmLabel="Disband all"
        variant="danger"
        onConfirm={handleBulkDisbandConfirm}
        onCancel={() => setBulkDisbandTeams(null)}
        loading={bulkDisbandLoading}
      />
    </main>
  );
}

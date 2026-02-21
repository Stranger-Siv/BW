"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateLabel } from "@/lib/formatDate";
import { ChangeDateModal, type TournamentOption } from "@/components/admin/ChangeDateModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { StatsCards } from "@/components/admin/StatsCards";
import { TeamsCards } from "@/components/admin/TeamsCards";
import { TeamsTable, type AdminTeam } from "@/components/admin/TeamsTable";

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

  const tournamentOptionsForModal: TournamentOption[] = tournaments.map((t) => ({
    _id: t._id,
    name: t.name,
    date: t.date,
    maxTeams: t.maxTeams,
    registeredTeams: t.registeredTeams,
    isClosed: t.isClosed,
  }));

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 md:px-6 md:py-10 lg:px-8 lg:py-12">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Admin Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/tournaments"
              className="btn-gradient min-h-[44px] flex items-center"
            >
              Manage tournaments
            </Link>
            <Link
              href="/tournaments"
              className="min-h-[44px] flex items-center text-sm font-medium text-emerald-500 transition hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              ← Tournaments
            </Link>
          </div>
        </header>

        <div className="card-glass mb-6 p-4 sm:p-5">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create and edit tournaments, then come back here to view teams and manage registrations.
          </p>
          <Link
            href="/admin/tournaments"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Go to Tournaments page →
          </Link>
        </div>

        <div className="card-glass p-4 shadow-lg sm:p-6 md:p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-100 md:text-2xl">
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

              {teamsError && (
                <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
                  {teamsError}
                </div>
              )}

              <div className="mt-6 space-y-6">
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
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onChangeDate={openChangeDate}
                        onDisband={openDisband}
                        actionLoadingId={actionLoadingId}
                      />
                    </div>
                    <div className="md:hidden">
                      <TeamsCards
                        teams={teams}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onChangeDate={openChangeDate}
                        onDisband={openDisband}
                        actionLoadingId={actionLoadingId}
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
    </main>
  );
}

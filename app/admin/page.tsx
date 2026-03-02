"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePusherChannel } from "@/components/providers/PusherProvider";
import { formatDateLabel } from "@/lib/formatDate";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminDashboardSkeleton } from "@/components/admin/AdminSkeletons";
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

type UserSummary = {
  _id: string;
  createdAt: string;
  role?: string;
  banned?: boolean;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";
  const [tournaments, setTournaments] = useState<TournamentDoc[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [userStatsLoading, setUserStatsLoading] = useState(false);
  const [userStatsError, setUserStatsError] = useState<string | null>(null);

  const [siteStatus, setSiteStatus] = useState<{
    maintenanceMode: boolean;
    announcement: { message: string; active: boolean };
  } | null>(null);
  const [siteStatusLoading, setSiteStatusLoading] = useState(false);
  const [siteStatusError, setSiteStatusError] = useState<string | null>(null);

  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");

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
  const [demoTeamsLoading, setDemoTeamsLoading] = useState(false);

  const selectedTournament = tournaments.find((t) => t._id === selectedTournamentId);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => {
      const fields: string[] = [
        t.teamName,
        t.rewardReceiverIGN,
        t.status,
        t._id,
        t.tournamentDate,
        t.createdAt,
      ];
      t.players.forEach((p) => {
        fields.push(p.minecraftIGN, p.discordUsername);
      });
      return fields.some((raw) => {
        const value = (raw ?? "").toString().toLowerCase();
        return value && value.includes(q);
      });
    });
  }, [teams, teamSearch]);

  const fetchUserStats = useCallback(async () => {
    if (!isSuperAdmin) return;
    setUserStatsLoading(true);
    setUserStatsError(null);
    try {
      const res = await fetch("/api/super-admin/users", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load users");
      }
      const data = await res.json();
      setUserSummaries(Array.isArray(data) ? data : []);
    } catch (e) {
      setUserSummaries([]);
      setUserStatsError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setUserStatsLoading(false);
    }
  }, [isSuperAdmin]);

  const fetchSiteStatus = useCallback(async () => {
    if (!isSuperAdmin) return;
    setSiteStatusLoading(true);
    setSiteStatusError(null);
    try {
      const res = await fetch("/api/super-admin/settings", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load site status");
      }
      const data = await res.json();
      setSiteStatus({
        maintenanceMode: Boolean(data.maintenanceMode),
        announcement: {
          message: data.announcement?.message ?? "",
          active: Boolean(data.announcement?.active),
        },
      });
    } catch (e) {
      setSiteStatus(null);
      setSiteStatusError(e instanceof Error ? e.message : "Failed to load site status");
    } finally {
      setSiteStatusLoading(false);
    }
  }, [isSuperAdmin]);

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

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUserStats();
      fetchSiteStatus();
    }
  }, [isSuperAdmin, fetchUserStats, fetchSiteStatus]);

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

  usePusherChannel(
    selectedTournamentId ? `tournament-${selectedTournamentId}` : null,
    "teams_changed",
    () => {
      if (selectedTournamentId) fetchTeams(selectedTournamentId);
    }
  );
  usePusherChannel("tournaments", "tournaments_changed", () => fetchTournaments());

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
      (p) => (p.minecraftIGN ?? "").trim() || (p.discordUsername ?? "").trim()
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

  const userStats = useMemo(() => {
    if (!userSummaries.length) {
      return {
        totalUsers: 0,
        usersToday: 0,
        totalAdmins: 0,
        bannedUsers: 0,
      };
    }
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let usersToday = 0;
    let totalAdmins = 0;
    let bannedUsers = 0;
    for (const u of userSummaries) {
      const created = u.createdAt ? new Date(u.createdAt) : null;
      if (created && created >= todayStart) usersToday += 1;
      if (u.role === "admin" || u.role === "super_admin") totalAdmins += 1;
      if (u.banned) bannedUsers += 1;
    }
    return {
      totalUsers: userSummaries.length,
      usersToday,
      totalAdmins,
      bannedUsers,
    };
  }, [userSummaries]);

  const tournamentStats = useMemo(() => {
    if (!tournaments.length) {
      return { total: 0, active: 0, upcoming: 0 };
    }
    let active = 0;
    let upcoming = 0;
    for (const t of tournaments) {
      if (t.status === "completed") continue;
      if (t.status === "draft" || t.status === "scheduled" || t.status === "registration_open") {
        upcoming += 1;
      } else {
        active += 1;
      }
    }
    return { total: tournaments.length, active, upcoming };
  }, [tournaments]);

  usePusherChannel(
    isSuperAdmin ? "site" : null,
    "maintenance_changed",
    (data: unknown) => {
      const payload = data as { maintenanceMode?: boolean };
      if (typeof payload.maintenanceMode !== "boolean") return;
      const mode = !!payload.maintenanceMode;
      setSiteStatus((prev) => ({
        maintenanceMode: mode,
        announcement:
          prev && prev.announcement
            ? prev.announcement
            : { message: "", active: false },
      }));
    }
  );

  usePusherChannel(
    isSuperAdmin ? "site" : null,
    "announcement_changed",
    (data: unknown) => {
      const payload = data as { message: string; active: boolean };
      if (typeof payload.message !== "string" || typeof payload.active !== "boolean") return;
      setSiteStatus((prev) => ({
        maintenanceMode: prev?.maintenanceMode ?? false,
        announcement: { message: payload.message, active: payload.active },
      }));
    }
  );

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

  const handleSetPending = useCallback(
    async (team: AdminTeam) => {
      if (!isSuperAdmin) return;
      setActionLoadingId(team._id);
      setActionError(null);
      try {
        const res = await fetch(`/api/admin/team/${team._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pending" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to set pending");
        refetch();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setActionLoadingId(null);
      }
    },
    [isSuperAdmin, refetch]
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

  const handleAddDemoTeams = useCallback(
    async (count: 16 | 32) => {
      if (!selectedTournamentId || !selectedTournament) return;
      setActionError(null);
      setDemoTeamsLoading(true);
      try {
        const res = await fetch(`/api/admin/tournaments/${selectedTournamentId}/teams/demo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to add demo teams");
        refetch();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Failed to add demo teams");
      } finally {
        setDemoTeamsLoading(false);
      }
    },
    [selectedTournamentId, selectedTournament, refetch]
  );

  const tournamentOptionsForModal: TournamentOption[] = tournaments.map((t) => ({
    _id: t._id,
    name: t.name,
    date: t.date,
    maxTeams: t.maxTeams,
    registeredTeams: t.registeredTeams,
    isClosed: t.isClosed,
  }));

  if (tournamentsLoading && tournaments.length === 0) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <main className="page pb-bottom-nav">
      <div className="page-inner-wide max-w-7xl">
        <AdminBreadcrumbs
          items={[
            { label: isSuperAdmin ? "Super admin" : "Dashboard" },
          ]}
          className="mb-4"
        />
        <header className="mb-4 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h1 className="page-title text-xl sm:text-2xl md:text-3xl">
            {isSuperAdmin ? "Super admin dashboard" : "Admin dashboard"}
          </h1>
          <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isSuperAdmin && (
              <Link
                href="/admin/users"
                className="admin-touch-btn flex border border-amber-400/50 bg-amber-500/20 text-amber-400 transition hover:bg-amber-500/30 dark:text-amber-300"
              >
                Manage users
              </Link>
            )}
            <Link
              href="/admin/tournaments"
              className="btn-gradient admin-touch-btn flex"
            >
              Manage tournaments
            </Link>
            <Link href="/tournaments" className="back-link admin-touch-btn flex">
              ← Tournaments
            </Link>
          </nav>
        </header>

        {isSuperAdmin && (
          <section className="mb-6">
            {userStatsError && (
              <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
                {userStatsError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Total users
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {userStatsLoading ? "…" : userStats.totalUsers}
                </p>
              </div>
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Joined today
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {userStatsLoading ? "…" : userStats.usersToday}
                </p>
              </div>
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Admins &amp; super admins
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {userStatsLoading ? "…" : userStats.totalAdmins}
                </p>
              </div>
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Banned users
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {userStatsLoading ? "…" : userStats.bannedUsers}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Total tournaments
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {tournamentStats.total}
                </p>
              </div>
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Active now
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {tournamentStats.active}
                </p>
              </div>
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Upcoming / registration
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {tournamentStats.upcoming}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Maintenance mode
                </p>
                {siteStatusError && (
                  <p className="mt-1 text-xs text-red-300">{siteStatusError}</p>
                )}
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {siteStatusLoading && !siteStatus
                    ? "Loading…"
                    : siteStatus?.maintenanceMode
                    ? "On"
                    : "Off"}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Changes here reflect the global maintenance switch in Settings.
                </p>
              </div>
              <div className="card-glass p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Announcement
                </p>
                {siteStatusError && (
                  <p className="mt-1 text-xs text-red-300">{siteStatusError}</p>
                )}
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {siteStatusLoading && !siteStatus
                    ? "Loading…"
                    : siteStatus?.announcement.active
                    ? "Active"
                    : "Hidden"}
                </p>
                {siteStatus?.announcement.message && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    “
                    {siteStatus.announcement.message.length > 140
                      ? `${siteStatus.announcement.message.slice(0, 137)}…`
                      : siteStatus.announcement.message}
                    ”
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="card mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create and edit tournaments, then come back here to view teams and manage registrations.
          </p>
          <Link href="/admin/tournaments" className="back-link mt-3 inline-flex items-center gap-1.5">
            Go to Tournaments page →
          </Link>
        </div>

        <div className="card-lg shadow-lg p-4 sm:p-6 md:p-8">
          <h2 className="section-title mb-4 !normal-case text-lg text-slate-800 dark:text-slate-100 sm:!text-xl md:!text-2xl">
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
                className="input-glass w-full max-w-md min-h-[48px] rounded-xl py-3 sm:min-h-0 sm:py-2.5"
                aria-label="Select tournament"
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

              {isSuperAdmin &&
                !selectedTournament.isClosed &&
                selectedTournament.registeredTeams < selectedTournament.maxTeams && (
                  <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 dark:border-amber-400/30 dark:bg-amber-500/10">
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Demo (testing):
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddDemoTeams(16)}
                      disabled={
                        demoTeamsLoading ||
                        selectedTournament.maxTeams - selectedTournament.registeredTeams < 16
                      }
                      className="rounded-full border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-500/30 disabled:opacity-50 dark:text-amber-200 dark:hover:bg-amber-500/30"
                    >
                      {demoTeamsLoading ? "Adding…" : "Add 16 demo teams"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDemoTeams(32)}
                      disabled={
                        demoTeamsLoading ||
                        selectedTournament.maxTeams - selectedTournament.registeredTeams < 32
                      }
                      className="rounded-full border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-500/30 disabled:opacity-50 dark:text-amber-200 dark:hover:bg-amber-500/30"
                    >
                      {demoTeamsLoading ? "Adding…" : "Add 32 demo teams"}
                    </button>
                  </div>
                )}

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
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">
                    Registered teams
                  </h3>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                    <div className="relative w-full max-w-xs sm:w-64">
                      <input
                        type="text"
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        placeholder="Search teams…"
                        className="w-full rounded-full border border-white/10 bg-slate-900/40 px-3 py-2 pl-9 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm outline-none ring-0 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/40 dark:bg-slate-900/60"
                      />
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
                        🔍
                      </span>
                    </div>
                    {selectedTeamIds.size > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-full text-sm text-slate-500 dark:text-slate-400 sm:w-auto">
                          {selectedTeamIds.size} selected
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={bulkApprove}
                            disabled={bulkLoading || selectedTeams.every((t) => t.status === "approved")}
                            className="admin-touch-btn rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-900 transition hover:opacity-90 disabled:opacity-50"
                          >
                            {bulkLoading ? "Processing…" : "Approve selected"}
                          </button>
                          <button
                            type="button"
                            onClick={bulkReject}
                            disabled={bulkLoading || selectedTeams.every((t) => t.status === "rejected")}
                            className="admin-touch-btn rounded-full border border-amber-400/50 bg-amber-500/20 text-amber-400 transition hover:bg-amber-500/30 disabled:opacity-50 dark:text-amber-300"
                          >
                            {bulkLoading ? "Processing…" : "Reject selected"}
                          </button>
                          <button
                            type="button"
                            onClick={openBulkDisband}
                            disabled={bulkLoading}
                            className="admin-touch-btn rounded-full border border-red-400/50 bg-red-500/20 text-red-400 transition hover:bg-red-500/30 disabled:opacity-50 dark:text-red-300"
                          >
                            Disband selected
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTeamIds(new Set())}
                            className="admin-touch-btn rounded-full border border-white/10 bg-white/10 text-slate-400 transition hover:bg-white/15 dark:text-slate-500 dark:hover:bg-white/15"
                          >
                            Clear selection
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
                        teams={filteredTeams}
                        selectedIds={selectedTeamIds}
                        onToggleSelect={toggleTeamSelection}
                        onToggleSelectAll={toggleSelectAllTeams}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onSetPending={isSuperAdmin ? handleSetPending : undefined}
                        isSuperAdmin={isSuperAdmin}
                        onChangeDate={openChangeDate}
                        onDisband={openDisband}
                        actionLoadingId={actionLoadingId}
                        bulkLoading={bulkLoading}
                      />
                    </div>
                    <div className="md:hidden">
                      <TeamsCards
                        teams={filteredTeams}
                        selectedIds={selectedTeamIds}
                        onToggleSelect={toggleTeamSelection}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onSetPending={isSuperAdmin ? handleSetPending : undefined}
                        isSuperAdmin={isSuperAdmin}
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

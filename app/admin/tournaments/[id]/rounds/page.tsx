"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminRoundsSkeleton } from "@/components/admin/AdminSkeletons";
import { usePusherChannel } from "@/components/providers/PusherProvider";

type MovePayload = {
  fromRoundId: string;
  newFromIds: string[];
  toRoundId: string;
  newToIds: string[];
};

type RoundDoc = {
  _id: string;
  tournamentId: string;
  roundNumber: number;
  name: string;
  scheduledAt?: string;
  teamIds: string[];
  isWinnerRound?: boolean;
  slotCount?: number;
};

type TeamDoc = { _id: string; teamName: string; rewardReceiverIGN?: string };

/** Fisher–Yates shuffle; returns a new array so teams are randomly assigned to rounds. */
function shuffleTeams<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function AdminTournamentRoundsPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [tournamentName, setTournamentName] = useState("");
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [roundLayerMeta, setRoundLayerMeta] = useState<Record<string, { label?: string; details?: string }>>({});
  const [rounds, setRounds] = useState<RoundDoc[]>([]);
  const [teams, setTeams] = useState<TeamDoc[]>([]);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoundName, setNewRoundName] = useState("");
  const [newRoundIsWinner, setNewRoundIsWinner] = useState(false);
  const [newRoundSlotCount, setNewRoundSlotCount] = useState<2 | 4>(4);
  const [addRoundLoading, setAddRoundLoading] = useState(false);
  const [dragged, setDragged] = useState<{ teamId: string; roundId: string } | null>(null);
  const [patchLoadingRounds, setPatchLoadingRounds] = useState<string[]>([]);
  const moveQueueRef = useRef<MovePayload[]>([]);
  const processingMoveRef = useRef(false);
  const processMoveQueueRef = useRef<() => void>(() => {});
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchRounds = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/tournaments/${id}/rounds`);
    if (!res.ok) {
      setError("Failed to load rounds");
      return;
    }
    const data = await res.json();
    setRounds(Array.isArray(data) ? data : []);
  }, [id]);

  const fetchTeams = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/teams?tournamentId=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const data = await res.json();
    setTeams(Array.isArray(data) ? data : []);
  }, [id]);

  const fetchTournament = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/tournaments`);
    if (!res.ok) return;
    const data = await res.json();
    const t = Array.isArray(data) ? data.find((x: { _id: string }) => x._id === id) : null;
    setTournamentName(t?.name ?? "Tournament");
    setWinnerTeamId(t?.winnerTeamId ?? null);
    setRoundLayerMeta((t?.roundLayerMeta ?? {}) as Record<string, { label?: string; details?: string }>);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: string } | null) => {
        if (!cancelled && data?.role === "super_admin") {
          setIsSuperAdmin(true);
        }
      })
      .catch(() => {
        // ignore – UI still works without role info
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([fetchRounds(), fetchTeams(), fetchTournament()]).finally(() =>
      setLoading(false)
    );
  }, [id, fetchRounds, fetchTeams, fetchTournament]);

  usePusherChannel(id ? `tournament-${id}` : null, "teams_changed", () => {
    fetchTeams();
    fetchRounds();
  });

  const addRound = useCallback(async () => {
    if (!newRoundName.trim()) return;
    setAddRoundLoading(true);
    try {
      const body: { name: string; isWinnerRound?: boolean; slotCount?: number } = {
        name: newRoundName.trim(),
      };
      if (newRoundIsWinner) body.isWinnerRound = true;
      body.slotCount = newRoundSlotCount;
      const res = await fetch(`/api/admin/tournaments/${id}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to add round");
      setNewRoundName("");
      setNewRoundIsWinner(false);
      setNewRoundSlotCount(4);
      fetchRounds();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddRoundLoading(false);
    }
  }, [id, newRoundName, newRoundIsWinner, newRoundSlotCount, fetchRounds]);

  const [layerDraft, setLayerDraft] = useState<Record<string, { label: string; details: string }>>({});
  useEffect(() => {
    setLayerDraft((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(roundLayerMeta ?? {})) {
        if (!next[k]) {
          next[k] = { label: (v?.label ?? ""), details: (v?.details ?? "") };
        }
      }
      return next;
    });
  }, [roundLayerMeta]);

  const getLayerKey = (roundName: string) => {
    const m = /^R(\d)/.exec(roundName || "");
    return m?.[1] ?? "0";
  };

  const saveLayerMeta = useCallback(
    async (layerKey: string) => {
      const draft = layerDraft[layerKey] ?? { label: "", details: "" };
      setError(null);
      try {
        const nextMeta = {
          ...(roundLayerMeta ?? {}),
          [layerKey]: {
            ...(draft.label.trim() ? { label: draft.label.trim() } : {}),
            ...(draft.details.trim() ? { details: draft.details.trim() } : {}),
          },
        };
        const res = await fetch(`/api/admin/tournaments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundLayerMeta: nextMeta }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to save layer details");
        setRoundLayerMeta(nextMeta);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save layer details");
      }
    },
    [id, layerDraft, roundLayerMeta]
  );

  const deleteRound = useCallback(
    async (roundId: string) => {
      if (!confirm("Delete this round? Teams in it will be removed from the round (they are not deleted).")) return;
      setDeleteLoading(roundId);
      setError(null);
      try {
        const res = await fetch(`/api/admin/tournaments/${id}/rounds/${roundId}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to delete round");
        fetchRounds();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete");
      } finally {
        setDeleteLoading(null);
      }
    },
    [id, fetchRounds]
  );

  const R1_SERIES_NAMES = ["R11", "R12", "R13", "R14", "R15", "R16", "R17", "R18"] as const;
  const R2_SEMI_NAMES = ["R21", "R22"] as const;
  const R3_FINAL_NAME = "R3";

  const createRoundsWithTeams = useCallback(
    async (
      roundsToCreate: {
        name: string;
        roundNumber: number;
        teamIds: string[];
        isWinnerRound?: boolean;
        slotCount?: number;
      }[]
    ) => {
      for (const r of roundsToCreate) {
        const postBody: Record<string, unknown> = {
          name: r.name,
          roundNumber: r.roundNumber,
        };
        if (r.isWinnerRound !== undefined) postBody.isWinnerRound = r.isWinnerRound;
        if (r.slotCount !== undefined) postBody.slotCount = r.slotCount;
        const postRes = await fetch(`/api/admin/tournaments/${id}/rounds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postBody),
        });
        const postData = await postRes.json().catch(() => ({}));
        if (!postRes.ok && !String(postData.error ?? "").includes("already exists")) {
          throw new Error(postData.error ?? `Failed to create ${r.name}`);
        }
        const roundsRes = await fetch(`/api/admin/tournaments/${id}/rounds`);
        const roundsList: RoundDoc[] = await roundsRes.json().catch(() => []);
        const round = roundsList.find((x) => x.roundNumber === r.roundNumber);
        if (!round) throw new Error(`Round ${r.name} not found after create`);
        const patchRes = await fetch(`/api/admin/tournaments/${id}/rounds`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId: round._id, teamIds: r.teamIds }),
        });
        if (!patchRes.ok) throw new Error(`Failed to add teams to ${r.name}`);
      }
      fetchRounds();
    },
    [id, fetchRounds]
  );

  /** Creates R11, R12, R13, R14 (4 teams each) and R2 (final). For 16-team squad. */
  const createAll16TeamRounds = useCallback(async () => {
    if (teams.length < 16) {
      setError("Need exactly 16 registered teams. You have " + teams.length + ".");
      return;
    }
    setAddRoundLoading(true);
    setError(null);
    try {
      const teamIds = shuffleTeams(teams.slice(0, 16)).map((t) => t._id);
      const roundsToCreate = [
        { name: "R11", roundNumber: 1, teamIds: teamIds.slice(0, 4) },
        { name: "R12", roundNumber: 2, teamIds: teamIds.slice(4, 8) },
        { name: "R13", roundNumber: 3, teamIds: teamIds.slice(8, 12) },
        { name: "R14", roundNumber: 4, teamIds: teamIds.slice(12, 16) },
        { name: "R2", roundNumber: 5, teamIds: [], isWinnerRound: true, slotCount: 4 },
      ];
      await createRoundsWithTeams(roundsToCreate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddRoundLoading(false);
    }
  }, [teams, createRoundsWithTeams]);

  /** Creates R11–R18 (8 groups of 4), R21/R22 (semi-finals), R3 (final). For 32-team squad. */
  const createAll32TeamRounds = useCallback(async () => {
    if (teams.length < 32) {
      setError("Need at least 32 registered teams. You have " + teams.length + ".");
      return;
    }
    setAddRoundLoading(true);
    setError(null);
    try {
      const teamIds = shuffleTeams(teams.slice(0, 32)).map((t) => t._id);
      const roundsToCreate = [
        { name: "R11", roundNumber: 1, teamIds: teamIds.slice(0, 4) },
        { name: "R12", roundNumber: 2, teamIds: teamIds.slice(4, 8) },
        { name: "R13", roundNumber: 3, teamIds: teamIds.slice(8, 12) },
        { name: "R14", roundNumber: 4, teamIds: teamIds.slice(12, 16) },
        { name: "R15", roundNumber: 5, teamIds: teamIds.slice(16, 20) },
        { name: "R16", roundNumber: 6, teamIds: teamIds.slice(20, 24) },
        { name: "R17", roundNumber: 7, teamIds: teamIds.slice(24, 28) },
        { name: "R18", roundNumber: 8, teamIds: teamIds.slice(28, 32) },
        { name: "R21", roundNumber: 9, teamIds: [] },
        { name: "R22", roundNumber: 10, teamIds: [] },
        { name: "R3", roundNumber: 11, teamIds: [], isWinnerRound: true, slotCount: 4 },
      ];
      await createRoundsWithTeams(roundsToCreate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddRoundLoading(false);
    }
  }, [teams, createRoundsWithTeams]);

  /**
   * Creates 44-team bracket (same structure as 16/32): 11 groups of 4 → 4 semi rounds → final.
   * R1-1…R1-11 (44 teams), R2-1…R2-4 (4 semi), R3 (winner round).
   */
  const createAll44TeamRounds = useCallback(async () => {
    if (teams.length < 44) {
      setError("Need at least 44 registered teams. You have " + teams.length + ".");
      return;
    }
    setAddRoundLoading(true);
    setError(null);
    try {
      const teamIds = shuffleTeams(teams.slice(0, 44)).map((t) => t._id);
      const roundsToCreate: {
        name: string;
        roundNumber: number;
        teamIds: string[];
        isWinnerRound?: boolean;
        slotCount?: number;
      }[] = [];

      for (let i = 0; i < 11; i += 1) {
        const index = i + 1;
        roundsToCreate.push({
          name: `R1-${index}`,
          roundNumber: index,
          teamIds: teamIds.slice(i * 4, i * 4 + 4),
        });
      }

      for (let i = 1; i <= 4; i += 1) {
        roundsToCreate.push({
          name: `R2-${i}`,
          roundNumber: 11 + i,
          teamIds: [],
          slotCount: 4,
        });
      }

      roundsToCreate.push({
        name: "R3",
        roundNumber: 16,
        teamIds: [],
        isWinnerRound: true,
        slotCount: 4,
      });

      await createRoundsWithTeams(roundsToCreate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddRoundLoading(false);
    }
  }, [teams, createRoundsWithTeams]);

  /**
   * Creates a 64-team first layer for super admins:
   * - R1-1…R1-16 (16 groups of 4 teams each, 64 teams total)
   * - R2-1 (empty, 4-team knockout)
   * - R3 (final, winner round, 4 teams)
   *
   * Super admin can manually move winners forward using the advance arrows.
   */
  const createAll64TeamRounds = useCallback(async () => {
    if (teams.length < 64) {
      setError("Need at least 64 registered teams. You have " + teams.length + ".");
      return;
    }
    setAddRoundLoading(true);
    setError(null);
    try {
      const teamIds = shuffleTeams(teams.slice(0, 64)).map((t) => t._id);
      const roundsToCreate: {
        name: string;
        roundNumber: number;
        teamIds: string[];
        isWinnerRound?: boolean;
        slotCount?: number;
      }[] = [];

      for (let i = 0; i < 16; i += 1) {
        const index = i + 1;
        roundsToCreate.push({
          name: `R1-${index}`,
          roundNumber: index,
          teamIds: teamIds.slice(i * 4, i * 4 + 4),
        });
      }

      roundsToCreate.push({
        name: "R2-1",
        roundNumber: 17,
        teamIds: [],
        slotCount: 4,
      });

      roundsToCreate.push({
        name: "R3",
        roundNumber: 18,
        teamIds: [],
        isWinnerRound: true,
        slotCount: 4,
      });

      await createRoundsWithTeams(roundsToCreate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddRoundLoading(false);
    }
  }, [teams, createRoundsWithTeams]);


  const updateRoundTeamIds = useCallback(
    async (roundId: string, teamIds: string[]) => {
      setPatchLoadingRounds((prev) => [...prev, roundId]);
      try {
        const res = await fetch(`/api/admin/tournaments/${id}/rounds`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId, teamIds }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Update failed");
        fetchRounds();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      } finally {
        setPatchLoadingRounds((prev) => prev.filter((id) => id !== roundId));
      }
    },
    [id, fetchRounds]
  );

  const processMoveQueue = useCallback(() => {
    if (processingMoveRef.current || moveQueueRef.current.length === 0) return;
    const item = moveQueueRef.current.shift()!;
    processingMoveRef.current = true;
    setPatchLoadingRounds([item.fromRoundId, item.toRoundId]);
    const doPatch = (roundId: string, teamIds: string[]) =>
      fetch(`/api/admin/tournaments/${id}/rounds`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, teamIds }),
      }).then(async (res) => {
        await res.json().catch(() => ({}));
        if (!res.ok) throw new Error("Update failed");
      });
    doPatch(item.fromRoundId, item.newFromIds)
      .then(() => doPatch(item.toRoundId, item.newToIds))
      .then(() => fetchRounds())
      .catch((e) => setError(e instanceof Error ? e.message : "Update failed"))
      .finally(() => {
        setPatchLoadingRounds((prev) =>
          prev.filter((id) => id !== item.fromRoundId && id !== item.toRoundId)
        );
        processingMoveRef.current = false;
        processMoveQueueRef.current();
      });
  }, [id, fetchRounds]);
  processMoveQueueRef.current = processMoveQueue;

  const moveTeam = useCallback(
    (teamId: string, fromRoundId: string, toRoundId: string) => {
      const toRound = rounds.find((r) => r._id === toRoundId);
      if (!toRound) return;

      // Special case: dragging from the registered teams pool (no source round yet).
      if (fromRoundId === "pool") {
        const semiOrFinal =
          ["R2", "R21", "R22", R3_FINAL_NAME].includes(toRound.name) ||
          /^R2-\d+$/.test(toRound.name) ||
          toRound.slotCount === 4;
        const maxTeamsNext = semiOrFinal ? 4 : Infinity;
        const alreadyIn = toRound.teamIds.includes(teamId);
        if (!alreadyIn && toRound.teamIds.length >= maxTeamsNext) return;
        const newToIds = alreadyIn ? toRound.teamIds : [...toRound.teamIds, teamId];
        updateRoundTeamIds(toRoundId, newToIds);
        return;
      }

      const fromRound = rounds.find((r) => r._id === fromRoundId);
      if (!fromRound) return;

      // Always keep the team in the source round (copy behavior), like the advance-arrow.
      const newFromIds = fromRound.teamIds;
      const semiOrFinal =
        ["R2", "R21", "R22", R3_FINAL_NAME].includes(toRound.name) ||
        /^R2-\d+$/.test(toRound.name) ||
        toRound.slotCount === 4;
      const maxTeamsNext = semiOrFinal ? 4 : Infinity;
      const wouldAdd = !toRound.teamIds.includes(teamId);
      if (wouldAdd && toRound.teamIds.length >= maxTeamsNext) return;
      const newToIds = toRound.teamIds.includes(teamId)
        ? toRound.teamIds
        : [...toRound.teamIds, teamId];

      setRounds((prev) =>
        prev.map((r) => {
          if (r._id === fromRoundId) return { ...r, teamIds: newFromIds };
          if (r._id === toRoundId) return { ...r, teamIds: newToIds };
          return r;
        })
      );

      moveQueueRef.current.push({ fromRoundId, newFromIds, toRoundId, newToIds });
      processMoveQueue();
    },
    [rounds, processMoveQueue]
  );

  const saveRoundSchedule = useCallback(
    async (roundId: string) => {
      setPatchLoadingRounds((prev) => [...prev, roundId]);
      try {
        const res = await fetch(`/api/admin/tournaments/${id}/rounds`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roundId,
            scheduledAt: scheduleValue ? new Date(scheduleValue).toISOString() : null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        setEditingSchedule(null);
        setScheduleValue("");
        fetchRounds();
      } catch {
        setError("Failed to update schedule");
      } finally {
        setPatchLoadingRounds((prev) => prev.filter((id) => id !== roundId));
      }
    },
    [id, scheduleValue, fetchRounds]
  );

  const removeFromRound = useCallback(
    (roundId: string, teamId: string) => {
      const round = rounds.find((r) => r._id === roundId);
      if (!round) return;
      updateRoundTeamIds(roundId, round.teamIds.filter((tid) => tid !== teamId));
    },
    [rounds, updateRoundTeamIds]
  );

  const handleDragStart = (e: React.DragEvent, teamId: string, roundId: string) => {
    setDragged({ teamId, roundId });
    e.dataTransfer.setData("text/plain", JSON.stringify({ teamId, roundId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, toRoundId: string) => {
    e.preventDefault();
    setDragged(null);
    try {
      const raw = e.dataTransfer.getData("text/plain");
      const { teamId, roundId: fromRoundId } = JSON.parse(raw) as { teamId: string; roundId: string };
      if (fromRoundId !== toRoundId) moveTeam(teamId, fromRoundId, toRoundId);
    } catch {
      // ignore
    }
  };

  const handlePoolDragStart = (e: React.DragEvent, teamId: string) => {
    setDragged({ teamId, roundId: "pool" });
    e.dataTransfer.setData("text/plain", JSON.stringify({ teamId, roundId: "pool" }));
    e.dataTransfer.effectAllowed = "move";
  };

  const setWinner = useCallback(
    async (teamId: string) => {
      setWinnerLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/tournaments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          // When a winner is set from the rounds UI, auto-mark the tournament as completed.
          body: JSON.stringify({ winnerTeamId: teamId, status: "completed" }),
        });
        if (!res.ok) throw new Error("Failed to set winner");
        setWinnerTeamId(teamId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to set winner");
      } finally {
        setWinnerLoading(false);
      }
    },
    [id]
  );

  const clearWinner = useCallback(async () => {
    setWinnerLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerTeamId: null }),
      });
      if (!res.ok) throw new Error("Failed to clear winner");
      setWinnerTeamId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear winner");
    } finally {
      setWinnerLoading(false);
    }
  }, [id]);

  const handleWinnerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragged(null);
    try {
      const raw = e.dataTransfer.getData("text/plain");
      const { teamId } = JSON.parse(raw) as { teamId: string; roundId: string };
      setWinner(teamId);
    } catch {
      // ignore
    }
  };

  const winnerTeam = winnerTeamId ? teams.find((t) => t._id === winnerTeamId) : null;

  const teamIdToName = useCallback(
    (tid: string) => teams.find((t) => t._id === tid)?.teamName ?? tid.slice(-6),
    [teams]
  );

  if (!id) {
    return (
      <main className="min-h-screen bg-slate-300/90 p-6 dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-400">Invalid tournament.</p>
      </main>
    );
  }

  if (loading) {
    return <AdminRoundsSkeleton />;
  }

  return (
    <main className="min-h-screen pb-bottom-nav bg-slate-300/90 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-8">
        <AdminBreadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Tournaments", href: "/admin/tournaments" },
            { label: tournamentName ? `Rounds: ${tournamentName}` : "Rounds" },
          ]}
          className="mb-4"
        />
        <h1 className="mb-4 text-xl font-bold text-amber-600 dark:text-amber-400 sm:text-2xl sm:mb-6">
          Rounds: {tournamentName}
        </h1>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100/80 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        <>
            <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <input
                type="text"
                value={newRoundName}
                onChange={(e) => setNewRoundName(e.target.value)}
                placeholder="New round name (e.g. Round 2)"
                className="min-h-[44px] w-full min-w-0 rounded-lg border border-slate-400/60 bg-slate-100 px-4 py-2.5 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:w-auto"
                aria-label="New round name"
              />
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-400/60 bg-slate-100 px-4 py-2.5 dark:border-slate-600 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={newRoundIsWinner}
                  onChange={(e) => setNewRoundIsWinner(e.target.checked)}
                  className="rounded border-slate-400"
                />
                <span className="text-sm text-slate-800 dark:text-slate-200">Winner round (final)</span>
              </label>
              <label className="flex min-h-[44px] items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <span>Teams in match:</span>
                <select
                  value={newRoundSlotCount}
                  onChange={(e) => setNewRoundSlotCount(e.target.value === "2" ? 2 : 4)}
                  className="rounded-lg border border-slate-400/60 bg-slate-100 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value={2}>2 (4v4)</option>
                  <option value={4}>4 (4v4v4v4)</option>
                </select>
              </label>
              <button
                type="button"
                onClick={addRound}
                disabled={addRoundLoading || !newRoundName.trim()}
                className="min-h-[44px] w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-60 sm:w-auto"
              >
                {addRoundLoading ? "Adding…" : "Add round"}
              </button>
            </div>

            {/* Layer metadata (one label/details per layer) */}
            {(() => {
              const layerKeys = Array.from(
                new Set(rounds.map((r) => getLayerKey(r.name)).filter((k) => k && k !== "0"))
              ).sort();
              if (!layerKeys.length) return null;
              return (
                <div className="mb-6 rounded-xl border border-slate-400/40 bg-slate-200/70 p-4 dark:border-slate-600 dark:bg-slate-800/50">
                  <h2 className="mb-2 font-semibold text-slate-800 dark:text-slate-200">Layer details (shown to players)</h2>
                  <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                    Layer is the first digit after R (e.g. R11–R18 = layer 1, R21–R22 = layer 2). The second digit is the match in that layer.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {layerKeys.map((k) => (
                      <div key={k} className="rounded-lg border border-slate-400/30 bg-slate-100/70 p-3 dark:border-slate-600 dark:bg-slate-900/30">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Layer {k}</span>
                          <button
                            type="button"
                            onClick={() => saveLayerMeta(k)}
                            className="rounded bg-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                          >
                            Save
                          </button>
                        </div>
                        <input
                          type="text"
                          value={layerDraft[k]?.label ?? (roundLayerMeta[k]?.label ?? "")}
                          onChange={(e) =>
                            setLayerDraft((prev) => ({
                              ...prev,
                              [k]: { label: e.target.value, details: prev[k]?.details ?? (roundLayerMeta[k]?.details ?? "") },
                            }))
                          }
                          placeholder="Label (e.g. Knockout / Quarter-final / Semi-final / Final)"
                          className="mb-2 w-full rounded border border-slate-400/60 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                        <textarea
                          value={layerDraft[k]?.details ?? (roundLayerMeta[k]?.details ?? "")}
                          onChange={(e) =>
                            setLayerDraft((prev) => ({
                              ...prev,
                              [k]: { label: prev[k]?.label ?? (roundLayerMeta[k]?.label ?? ""), details: e.target.value },
                            }))
                          }
                          placeholder="Public details for this layer (optional)"
                          className="w-full rounded border border-slate-400/60 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Winner section */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleWinnerDrop}
              className={`mb-6 rounded-xl border-2 border-dashed p-4 transition-colors ${
                winnerTeam
                  ? "border-amber-500/60 bg-amber-50/80 dark:border-amber-400/50 dark:bg-amber-900/20"
                  : "border-slate-400/50 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/40"
              }`}
            >
              <h2 className="mb-2 font-semibold text-slate-800 dark:text-slate-200">
                Tournament winner
              </h2>
              {winnerLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Updating…</p>
              ) : winnerTeam ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-amber-700 dark:text-amber-300">
                    {winnerTeam.teamName}
                  </span>
                  {winnerTeam.rewardReceiverIGN && (
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Reward: {winnerTeam.rewardReceiverIGN}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearWinner}
                    disabled={winnerLoading}
                    className="rounded bg-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-400 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 disabled:opacity-50"
                  >
                    Clear winner
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Click the 🏆 button next to a team in the round marked as winner (final) to set as tournament winner.
                </p>
              )}
            </div>

            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              16-team: R11–R14 → R2. 32-team: R11–R18 → R21/R22 → R3. 44-team: R1-1–R1-11 → R2-1–R2-4 → R3. For 64-team brackets, a super admin can auto-create R1-1–R1-16, R2-1, R3. You can also add custom rounds. Mark a round as &quot;Winner round&quot; to use 🏆 and show the champion on the public page.
            </p>

            {(() => {
              const groupRoundNames = ["R11", "R12", "R13", "R14", "R15", "R16", "R17", "R18"];
              const semiNames = ["R21", "R22"];
              const isGroupRound = (name: string) => groupRoundNames.includes(name) || /^R1-\d+$/.test(name);
              const isSemiRound = (name: string) => semiNames.includes(name) || /^R2-\d+$/.test(name);
              const groupRounds = rounds.filter((r) => isGroupRound(r.name)).sort((a, b) => a.roundNumber - b.roundNumber);
              const semiRounds = rounds.filter((r) => isSemiRound(r.name)).sort((a, b) => a.roundNumber - b.roundNumber);
              const otherRounds = rounds.filter((r) => !isGroupRound(r.name) && !isSemiRound(r.name)).sort((a, b) => a.roundNumber - b.roundNumber);

              const renderRoundCard = (round: RoundDoc) => (
                <div
                  key={round._id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, round._id)}
                  className="min-w-[220px] rounded-xl border-2 border-slate-400/40 bg-slate-200/80 p-4 dark:border-slate-600 dark:bg-slate-800/60"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-200">
                      {round.name}
                    </h2>
                    <div className="flex items-center gap-1">
                      {patchLoadingRounds.includes(round._id) && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      )}
                      <button
                        type="button"
                        onClick={() => deleteRound(round._id)}
                        disabled={deleteLoading !== null}
                        className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40 disabled:opacity-50"
                        title="Delete round"
                      >
                        {deleteLoading === round._id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                  {editingSchedule === round._id ? (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <input
                        type="datetime-local"
                        value={scheduleValue}
                        onChange={(e) => setScheduleValue(e.target.value)}
                        className="rounded border border-slate-400/60 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => saveRoundSchedule(round._id)}
                        className="rounded bg-amber-500 px-2 py-1 text-xs text-slate-900 hover:bg-amber-400"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingSchedule(null); setScheduleValue(""); }}
                        className="rounded bg-slate-300 px-2 py-1 text-xs dark:bg-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mb-2 flex items-center gap-2">
                      {round.scheduledAt ? (
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {new Date(round.scheduledAt).toLocaleString()}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSchedule(round._id);
                          setScheduleValue(round.scheduledAt ? new Date(round.scheduledAt).toISOString().slice(0, 16) : "");
                        }}
                        className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                      >
                        {round.scheduledAt ? "Change time" : "Set date/time"}
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {round.teamIds.length === 0 ? (
                      <p className="rounded bg-slate-300/50 py-4 text-center text-sm text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                        Drop teams here
                      </p>
                    ) : (
                      round.teamIds.map((tid) => (
                        <div
                          key={tid}
                          draggable
                          onDragStart={(e) => handleDragStart(e, tid, round._id)}
                          className="group flex items-center justify-between rounded-lg border border-slate-400/50 bg-slate-100 py-2 pl-3 pr-2 dark:border-slate-600 dark:bg-slate-700/50"
                        >
                          <Link
                            href={`/admin/teams/${tid}`}
                            className="truncate text-sm font-medium text-slate-800 hover:text-amber-600 hover:underline dark:text-slate-200 dark:hover:text-amber-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {teamIdToName(tid)}
                          </Link>
                          <div className="flex items-center gap-1">
                            {(round.isWinnerRound === true || round.name === "R2" || round.name === "R3") ? (
                              <button
                                type="button"
                                onClick={() => setWinner(tid)}
                                disabled={winnerLoading}
                                className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:text-amber-300 dark:hover:bg-amber-900/40 disabled:opacity-50"
                                title="Set as tournament winner"
                              >
                                🏆
                              </button>
                            ) : (
                              (() => {
                                const isR1Series = (R1_SERIES_NAMES as readonly string[]).includes(round.name);
                                const isR1Dash = /^R1-\d+$/.test(round.name);
                                const isSemi = (R2_SEMI_NAMES as readonly string[]).includes(round.name);
                                const isR2Dash = /^R2-\d+$/.test(round.name);
                                const r21 = rounds.find((r) => r.name === "R21");
                                const r22 = rounds.find((r) => r.name === "R22");
                                const r3 = rounds.find((r) => r.name === "R3");
                                const r2 = rounds.find((r) => r.name === "R2");
                                let advanceTo: RoundDoc | undefined;
                                if (isR1Series) {
                                  if (["R11", "R12", "R13", "R14"].includes(round.name) && r21) advanceTo = r21;
                                  else if (["R11", "R12", "R13", "R14"].includes(round.name) && r2) advanceTo = r2;
                                  else if (["R15", "R16", "R17", "R18"].includes(round.name) && r22) advanceTo = r22;
                                } else if (isR1Dash) {
                                  const n = parseInt(round.name.replace("R1-", ""), 10);
                                  if (n <= 3) advanceTo = rounds.find((r) => r.name === "R2-1");
                                  else if (n <= 6) advanceTo = rounds.find((r) => r.name === "R2-2");
                                  else if (n <= 9) advanceTo = rounds.find((r) => r.name === "R2-3");
                                  else advanceTo = rounds.find((r) => r.name === "R2-4");
                                } else if ((isSemi || isR2Dash) && r3) advanceTo = r3;
                                else advanceTo = rounds[rounds.findIndex((r) => r._id === round._id) + 1];
                                const title = advanceTo ? `Advance to ${advanceTo.name}` : undefined;
                                return advanceTo ? (
                                  <button
                                    type="button"
                                    onClick={() => moveTeam(tid, round._id, advanceTo!._id)}
                                    className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:text-amber-300 dark:hover:bg-amber-900/40"
                                    title={title}
                                  >
                                    →
                                  </button>
                                ) : null;
                              })()
                            )}
                            <button
                              type="button"
                              onClick={() => removeFromRound(round._id, tid)}
                              className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );

              return (
                <div className="space-y-8 pb-8">
                  {groupRounds.length > 0 && (
                    <div className="flex flex-wrap gap-6 overflow-x-auto">
                      {groupRounds.map(renderRoundCard)}
                    </div>
                  )}
                  {semiRounds.length > 0 && (
                    <div className="flex flex-wrap gap-6 overflow-x-auto">
                      <span className="sr-only">Semi-finals (same level)</span>
                      {semiRounds.map(renderRoundCard)}
                    </div>
                  )}
                  {otherRounds.length > 0 && (
                    <div className="flex flex-wrap gap-6 overflow-x-auto">
                      {otherRounds.map(renderRoundCard)}
                    </div>
                  )}
                </div>
              );
            })()}

            {rounds.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Add a round to get started. Round 1 is often created first and filled with all registered teams.
              </p>
            )}

            <div className="mt-8 rounded-xl border border-slate-400/40 bg-slate-200/80 p-4 dark:border-slate-600 dark:bg-slate-800/60">
              <h3 className="mb-2 font-semibold text-slate-800 dark:text-slate-200">
                Registered teams ({teams.length})
              </h3>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-500">
                Drag a team from here into any round above. 16: R11–R14 + R2. 32: R11–R18 + R21/R22 + R3. 44: R1-1–R1-11 + R2-1–R2-4 + R3. Advance with →; in the final round click 🏆 to set winner.
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={createAll16TeamRounds}
                  disabled={addRoundLoading || teams.length < 16}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-60"
                >
                  {addRoundLoading ? "Creating…" : "Create 16-team rounds (R11–R14 & R2)"}
                </button>
                <button
                  type="button"
                  onClick={createAll32TeamRounds}
                  disabled={addRoundLoading || teams.length < 32}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-500 disabled:opacity-60"
                >
                  {addRoundLoading ? "Creating…" : "Create 32-team rounds (R11–R18, R21, R22, R3)"}
                </button>
                <button
                  type="button"
                  onClick={createAll44TeamRounds}
                  disabled={addRoundLoading || teams.length < 44}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-500 disabled:opacity-60"
                >
                  {addRoundLoading ? "Creating…" : "Create 44-team rounds (R1-1–R1-11, R2-1–R2-4, R3)"}
                </button>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={createAll64TeamRounds}
                    disabled={addRoundLoading || teams.length < 64}
                    className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-slate-50 hover:bg-amber-600 disabled:opacity-60"
                  >
                    {addRoundLoading
                      ? "Creating…"
                      : "Create 64-team rounds (R1-1–R1-16, R2-1, R3)"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <div
                    key={t._id}
                    draggable
                    onDragStart={(e) => handlePoolDragStart(e, t._id)}
                    className="cursor-grab rounded bg-slate-300/60 px-2 py-1 text-sm font-medium text-slate-800 transition hover:bg-amber-500/30 hover:text-amber-800 dark:bg-slate-700/60 dark:text-slate-200 dark:hover:bg-amber-500/30 dark:hover:text-amber-200"
                  >
                    <Link
                      href={`/admin/teams/${t._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate"
                    >
                      {t.teamName}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
        </>
      </div>
    </main>
  );
}

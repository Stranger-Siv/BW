"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
};

type TeamDoc = { _id: string; teamName: string; rewardReceiverIGN?: string };

export default function AdminTournamentRoundsPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [tournamentName, setTournamentName] = useState("");
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundDoc[]>([]);
  const [teams, setTeams] = useState<TeamDoc[]>([]);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoundName, setNewRoundName] = useState("");
  const [addRoundLoading, setAddRoundLoading] = useState(false);
  const [dragged, setDragged] = useState<{ teamId: string; roundId: string } | null>(null);
  const [patchLoadingRounds, setPatchLoadingRounds] = useState<string[]>([]);
  const moveQueueRef = useRef<MovePayload[]>([]);
  const processingMoveRef = useRef(false);
  const processMoveQueueRef = useRef<() => void>(() => {});
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

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
  }, [id]);

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

  const addRound = useCallback(async () => {
    if (!newRoundName.trim()) return;
    setAddRoundLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${id}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoundName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to add round");
      setNewRoundName("");
      fetchRounds();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddRoundLoading(false);
    }
  }, [id, newRoundName, fetchRounds]);

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

  const createRound1WithAllTeams = useCallback(async () => {
    setAddRoundLoading(true);
    setError(null);
    try {
      const postRes = await fetch(`/api/admin/tournaments/${id}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Round 1", roundNumber: 1 }),
      });
      const postData = await postRes.json().catch(() => ({}));
      if (!postRes.ok && !String(postData.error ?? "").includes("already exists")) {
        throw new Error(postData.error ?? "Failed to create Round 1");
      }
      const roundsRes = await fetch(`/api/admin/tournaments/${id}/rounds`);
      const roundsList: RoundDoc[] = await roundsRes.json().catch(() => []);
      const round1 = roundsList.find((r) => r.roundNumber === 1);
      if (round1 && teams.length > 0) {
        const res = await fetch(`/api/admin/tournaments/${id}/rounds`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId: round1._id, teamIds: teams.map((t) => t._id) }),
        });
        if (!res.ok) throw new Error("Failed to add teams to Round 1");
      }
      fetchRounds();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddRoundLoading(false);
    }
  }, [id, teams, fetchRounds]);

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
      const fromRound = rounds.find((r) => r._id === fromRoundId);
      const toRound = rounds.find((r) => r._id === toRoundId);
      if (!fromRound || !toRound) return;
      const newFromIds = fromRound.teamIds.filter((tid) => tid !== teamId);
      const newToIds = toRound.teamIds.includes(teamId) ? toRound.teamIds : [...toRound.teamIds, teamId];
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

  const setWinner = useCallback(
    async (teamId: string) => {
      setWinnerLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/tournaments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winnerTeamId: teamId }),
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

  return (
    <main className="min-h-screen bg-slate-300/90 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href="/admin/tournaments"
            className="text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Tournaments
          </Link>
          <h1 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            Rounds: {tournamentName}
          </h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-100/80 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-600 dark:text-slate-400">Loading…</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={newRoundName}
                onChange={(e) => setNewRoundName(e.target.value)}
                placeholder="New round name (e.g. Round 2)"
                className="rounded-lg border border-slate-400/60 bg-slate-100 px-4 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={addRound}
                disabled={addRoundLoading || !newRoundName.trim()}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-60"
              >
                {addRoundLoading ? "Adding…" : "Add round"}
              </button>
            </div>

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
                  Drag a team from any round here to set as tournament winner.
                </p>
              )}
            </div>

            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Drag teams between rounds to advance them. First round can be filled from registered teams below.
            </p>

            <div className="flex flex-wrap gap-6 overflow-x-auto pb-8">
              {rounds.map((round) => (
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
                          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                            {teamIdToName(tid)}
                          </span>
                          <div className="flex items-center gap-1">
                            {rounds.findIndex((r) => r._id === round._id) < rounds.length - 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = rounds[rounds.findIndex((r) => r._id === round._id) + 1];
                                  if (next) moveTeam(tid, round._id, next._id);
                                }}
                                className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:text-amber-300 dark:hover:bg-amber-900/40"
                              >
                                →
                              </button>
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
              ))}
            </div>

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
                Create Round 1 and add all registered teams in one go, then drag teams to later rounds as they advance.
              </p>
              <button
                type="button"
                onClick={createRound1WithAllTeams}
                disabled={addRoundLoading || teams.length === 0}
                className="mb-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400 disabled:opacity-60"
              >
                {addRoundLoading ? "Creating…" : "Create Round 1 and add all teams"}
              </button>
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <span
                    key={t._id}
                    className="rounded bg-slate-300/60 px-2 py-1 text-sm dark:bg-slate-700/60"
                  >
                    {t.teamName}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

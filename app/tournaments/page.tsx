"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { PlayerRow } from "@/components/registration/PlayerRow";
import { RewardReceiverSelect } from "@/components/registration/RewardReceiverSelect";
import { formatDateLabel, formatRegistrationCountdown } from "@/lib/formatDate";
import type { IPlayer } from "@/models/Team";

type TournamentOption = {
  _id: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  registrationDeadline: string;
  maxTeams: number;
  teamSize: number;
  registeredTeams: number;
};

function getInitialPlayers(count: number): IPlayer[] {
  return Array.from({ length: count }, () => ({
    minecraftIGN: "",
    discordUsername: "",
  }));
}

function validateForm(
  teamName: string,
  players: IPlayer[],
  rewardReceiverIGN: string,
  requiredCount: number
): string | null {
  if (!teamName.trim()) return "Team name is required.";
  if (players.length !== requiredCount) return "Player count does not match tournament.";
  for (let i = 0; i < players.length; i++) {
    if (!players[i].minecraftIGN.trim()) return `Player ${i + 1}: Minecraft IGN is required.`;
    if (!players[i].discordUsername.trim()) return `Player ${i + 1}: Discord username is required.`;
  }
  const igns = players.map((p) => p.minecraftIGN.trim()).filter(Boolean);
  if (igns.length !== requiredCount) return `All ${requiredCount} player(s) must have a Minecraft IGN.`;
  if (!rewardReceiverIGN.trim()) return "Please select the reward receiver.";
  if (!igns.includes(rewardReceiverIGN.trim())) return "Reward receiver must be one of the players.";
  return null;
}

const TYPE_LABEL: Record<string, string> = {
  solo: "Solo",
  duo: "Duo",
  squad: "Squad",
};

export default function TournamentsPage() {
  const { data: session, status } = useSession();
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedTournament, setSelectedTournament] = useState<TournamentOption | null>(null);
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [rewardReceiverIGN, setRewardReceiverIGN] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [meDisplayName, setMeDisplayName] = useState<string | null>(null);
  const [teamNameAvailable, setTeamNameAvailable] = useState<boolean | null>(null);
  const [teamNameCheckLoading, setTeamNameCheckLoading] = useState(false);
  const [teamNameSuggestions, setTeamNameSuggestions] = useState<string[]>([]);
  const [playerErrors, setPlayerErrors] = useState<Record<number, string>>({});
  const [playersCheckLoading, setPlayersCheckLoading] = useState(false);

  const duplicateWithinForm = useMemo(() => {
    const key = (ign: string, discord: string) => `${(ign || "").trim().toLowerCase()}|${(discord || "").trim()}`;
    const seen = new Map<string, number>();
    const err: Record<number, string> = {};
    players.forEach((p, i) => {
      const k = key(p.minecraftIGN, p.discordUsername);
      if (!k || k === "|") return;
      if (seen.has(k)) {
        err[seen.get(k)!] = "Same Minecraft IGN + Discord cannot appear twice.";
        err[i] = "Same Minecraft IGN + Discord cannot appear twice.";
      } else {
        seen.set(k, i);
      }
    });
    return err;
  }, [players]);

  const allPlayerErrors = useMemo(() => ({ ...duplicateWithinForm, ...playerErrors }), [duplicateWithinForm, playerErrors]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setFetchLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/tournaments", { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to load tournaments");
        }
        const data = await res.json();
        if (!cancelled) setTournaments(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "Failed to load tournaments");
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      setPlayers(getInitialPlayers(selectedTournament.teamSize));
      setRewardReceiverIGN("");
      setSubmitError(null);
      setSuccessMessage(null);
      setMeDisplayName(null);
      setTeamNameAvailable(null);
      setPlayerErrors({});
    }
  }, [selectedTournament]);

  useEffect(() => {
    if (!selectedTournament || !teamName.trim()) {
      setTeamNameAvailable(null);
      return;
    }
    const t = teamName.trim();
    const timer = setTimeout(() => {
      setTeamNameCheckLoading(true);
      fetch(`/api/tournaments/${selectedTournament._id}/check-name?name=${encodeURIComponent(t)}`)
        .then((r) => r.json())
        .then((data: { available?: boolean }) => {
          setTeamNameAvailable(data.available === true);
        })
        .catch(() => setTeamNameAvailable(null))
        .finally(() => setTeamNameCheckLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedTournament?._id, teamName]);

  useEffect(() => {
    if (!selectedTournament || !session?.user?.id) return;
    let cancelled = false;
    fetch("/api/users/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((p: { displayName?: string; name?: string; minecraftIGN?: string; discordUsername?: string }) => {
        if (cancelled || !selectedTournament) return;
        setMeDisplayName(p.displayName || p.name || null);
        const initial = getInitialPlayers(selectedTournament.teamSize);
        initial[0] = { minecraftIGN: p.minecraftIGN ?? "", discordUsername: p.discordUsername ?? "" };
        setPlayers(initial);
        if (selectedTournament.teamSize === 1) setRewardReceiverIGN((p.minecraftIGN ?? "").trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedTournament?.teamSize, selectedTournament?._id, session?.user?.id]);

  useEffect(() => {
    if (!selectedTournament) {
      setPlayerErrors({});
      return;
    }
    const hasAnyFilled = players.some((p) => (p.minecraftIGN || "").trim() && (p.discordUsername || "").trim());
    if (!hasAnyFilled) {
      setPlayerErrors({});
      return;
    }
    const timer = setTimeout(() => {
      setPlayersCheckLoading(true);
      const body: { players: { minecraftIGN: string; discordUsername: string }[]; teamName?: string; captainId?: string } = {
        players: players.map((p) => ({ minecraftIGN: (p.minecraftIGN || "").trim(), discordUsername: (p.discordUsername || "").trim() })),
      };
      if (teamName.trim()) body.teamName = teamName.trim();
      if (session?.user?.id) body.captainId = session.user.id;
      fetch(`/api/tournaments/${selectedTournament._id}/check-players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((data: { taken?: { index: number; minecraftIGN: string; discordUsername: string }[] }) => {
          const next: Record<number, string> = {};
          for (const t of data.taken ?? []) {
            next[t.index] = "This Minecraft IGN + Discord is already registered for this tournament. Each player can only be on one team.";
          }
          setPlayerErrors(next);
        })
        .catch(() => setPlayerErrors({}))
        .finally(() => setPlayersCheckLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedTournament?._id, players, teamName, session?.user?.id]);

  useEffect(() => {
    if (!selectedTournament || selectedTournament.teamSize === 1) {
      setTeamNameSuggestions([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/tournaments/${selectedTournament._id}/suggest-names?limit=5`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { suggestions?: string[] }) => {
        if (!cancelled && Array.isArray(data.suggestions)) setTeamNameSuggestions(data.suggestions);
      })
      .catch(() => setTeamNameSuggestions([]));
    return () => {
      cancelled = true;
    };
  }, [selectedTournament?._id, selectedTournament?.teamSize]);

  const rewardReceiverOptions = useMemo(
    () => players.map((p) => p.minecraftIGN.trim()).filter(Boolean),
    [players]
  );

  const updatePlayer = useCallback((index: number, field: "minecraftIGN" | "discordUsername", value: string) => {
    setPlayers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedTournament(null);
    setTeamName("");
    setPlayers([]);
    setRewardReceiverIGN("");
    setSubmitError(null);
    setSuccessMessage(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTournament) return;
      setSubmitError(null);
      setSuccessMessage(null);

      if (teamNameAvailable === false) {
        setSubmitError("This team name is already taken for this tournament. Choose another.");
        return;
      }
      const hasPlayerError = Object.keys(allPlayerErrors).length > 0;
      if (hasPlayerError) {
        setSubmitError("Fix player errors: same IGN + Discord cannot appear twice, and each player can only be on one team in this tournament.");
        return;
      }
      const err = validateForm(teamName, players, rewardReceiverIGN, selectedTournament.teamSize);
      if (err) {
        setSubmitError(err);
        return;
      }

      setSubmitLoading(true);
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamName: teamName.trim(),
            tournamentId: selectedTournament._id,
            players: players.map((p) => ({
              minecraftIGN: p.minecraftIGN.trim(),
              discordUsername: p.discordUsername.trim(),
            })),
            rewardReceiverIGN: rewardReceiverIGN.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSubmitError(data.error ?? "Registration failed");
          if (res.status === 401) setSubmitError("You must be signed in to register. Sign in or create an account above.");
          return;
        }
        setSuccessMessage(data.message ?? "Registered successfully!");
        setTeamName("");
        setPlayers(getInitialPlayers(selectedTournament.teamSize));
        setRewardReceiverIGN("");
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Request failed");
      } finally {
        setSubmitLoading(false);
      }
    },
    [selectedTournament, teamName, players, rewardReceiverIGN, teamNameAvailable, allPlayerErrors]
  );

  return (
    <main className="min-h-screen">
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:px-8 lg:py-16">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Tournaments
        </h1>
        <div className="card-glass mb-6 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <img
              src={SITE.hostedByLogo}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-white/10"
            />
            <div>
              <p className="text-sm font-medium text-slate-200">
                All matches on <strong>{SITE.serverName}</strong> · <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-400">{SITE.serverIp}</code>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Hosted by <strong className="text-slate-300">{SITE.hostedBy}</strong> · Full rules &amp; updates on Discord
              </p>
            </div>
          </div>
          <a
            href={SITE.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Join Discord
          </a>
        </div>
        <section>
          <div className="card-glass mx-auto max-w-5xl p-6 sm:p-8 md:p-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={SITE.hostedByLogo}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-white/10 md:h-14 md:w-14"
                />
                <div>
                  <h2 className="text-2xl font-semibold text-white md:text-3xl">
                    Tournament Registration
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Hosted by {SITE.hostedBy}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                {selectedTournament ? "Open" : "Choose tournament"}
              </span>
            </div>

            {fetchLoading && (
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Loading tournaments…
              </p>
            )}
            {fetchError && (
              <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
                {fetchError}
              </div>
            )}

            {status !== "loading" && !session && (
              <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                Sign in with Google to register your team.{" "}
                <Link href="/login" className="font-medium underline hover:no-underline">
                  Sign in
                </Link>
              </div>
            )}

            {!selectedTournament ? (
              <div id="tournaments" className="space-y-4 scroll-mt-8">
                <p className="text-slate-600 dark:text-slate-400">
                  Choose a tournament to register. Then fill in your team details on the next screen.
                </p>
                {tournaments.length === 0 && !fetchLoading && (
                  <div className="card-glass rounded-2xl p-6 text-center">
                    <p className="text-slate-500 dark:text-slate-400">
                      No tournaments open for registration right now. Check back later or ask an admin to open registration.
                    </p>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tournaments.map((t) => {
                    const remaining = Math.max(0, t.maxTeams - t.registeredTeams);
                    const typeLabel = TYPE_LABEL[t.type ?? "squad"] ?? (t.type ?? "Squad");
                    return (
                      <div
                        key={t._id}
                        className="card-glass transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedTournament(t)}
                          className="w-full p-5 text-left"
                        >
                          <span className="block font-semibold text-slate-800 dark:text-slate-100">
                            {t.name}
                          </span>
                          <span className="mt-1 inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400 dark:text-emerald-300">
                            {typeLabel}
                          </span>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            {formatDateLabel(t.date)} · {t.startTime}
                          </p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {remaining} slot{remaining !== 1 ? "s" : ""} left
                          </p>
                          {t.registrationDeadline && (
                            <p className="mt-1 text-xs font-medium text-emerald-400/90 dark:text-emerald-300">
                              {formatRegistrationCountdown(t.registrationDeadline).text}
                            </p>
                          )}
                        </button>
                        <Link
                          href={`/tournaments/${t._id}/rounds`}
                          onClick={(e) => e.stopPropagation()}
                          className="mx-5 mb-4 block text-center text-sm font-medium text-emerald-400 transition hover:text-emerald-300 dark:text-emerald-300 dark:hover:text-emerald-200"
                        >
                          View rounds & who advanced
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
          <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex flex-wrap items-center gap-3 sm:mb-6">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-sm text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  ← Choose another tournament
                </button>
                <span className="text-slate-400 dark:text-slate-500">|</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {selectedTournament.name}
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400 dark:text-emerald-300">
                  {TYPE_LABEL[selectedTournament.type ?? "squad"] ?? (selectedTournament.type ?? "Squad")}
                </span>
                {selectedTournament.registrationDeadline && (
                  <span className="text-sm font-medium text-emerald-400/90 dark:text-emerald-300">
                    {formatRegistrationCountdown(selectedTournament.registrationDeadline).text}
                  </span>
                )}
              </div>

              <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 sm:p-6 md:p-8">
                <h2 className="mb-5 text-xl font-semibold text-slate-800 dark:text-slate-100 sm:mb-6 sm:text-2xl">
                  {selectedTournament.teamSize === 1 ? "Register your entry" : "Team details"}
                </h2>
                {session?.user && meDisplayName && (
                  <p className="mb-5 text-sm text-slate-500 dark:text-slate-400 sm:mb-6">
                    Registering as <strong className="text-slate-800 dark:text-slate-100">{meDisplayName}</strong>
                  </p>
                )}

                <div className="space-y-6">
                  <div className="w-full">
                    <label htmlFor="team-name" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
                      {selectedTournament.teamSize === 1 ? "Display name" : "Team name"}
                    </label>
                    <input
                      id="team-name"
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder={selectedTournament.teamSize === 1 ? "e.g. Your IGN or nickname" : "e.g. Dragon Slayers"}
                      className={`w-full min-h-[48px] rounded-lg border bg-white/5 px-4 py-3 text-slate-800 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500 sm:min-h-[44px] sm:py-2.5 ${
                        teamNameAvailable === false
                          ? "border-red-400 dark:border-red-500"
                          : "border-white/10 dark:border-white/10 focus:border-emerald-400/50"
                      }`}
                      aria-required
                    />
                    {teamNameCheckLoading && teamName.trim() && (
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Checking name…</p>
                    )}
                    {!teamNameCheckLoading && teamName.trim() && teamNameAvailable === true && (
                      <p className="mt-1.5 text-xs text-emerald-400">Name available</p>
                    )}
                    {!teamNameCheckLoading && teamName.trim() && teamNameAvailable === false && (
                      <p className="mt-1.5 text-xs text-red-400">This name is already taken for this tournament</p>
                    )}
                    {selectedTournament.teamSize > 1 && teamNameSuggestions.length > 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Suggestions:{" "}
                        {teamNameSuggestions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setTeamName(name)}
                            className="mr-1.5 mt-0.5 inline-block rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-slate-600 transition hover:bg-emerald-500/20 hover:text-emerald-400 dark:text-slate-300 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
                          >
                            {name}
                          </button>
                        ))}
                      </p>
                    )}
                  </div>

                  {selectedTournament.teamSize === 1 ? (
                    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
                      <div className="w-full">
                        <h3 className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">Your details</h3>
                        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-1">
                          {(playersCheckLoading && (players[0]?.minecraftIGN?.trim() && players[0]?.discordUsername?.trim())) && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">Checking if this player is already registered…</p>
                          )}
                          <PlayerRow
                            index={0}
                            minecraftIGN={players[0]?.minecraftIGN ?? ""}
                            discordUsername={players[0]?.discordUsername ?? ""}
                            onIGNChange={(v) => updatePlayer(0, "minecraftIGN", v)}
                            onDiscordChange={(v) => updatePlayer(0, "discordUsername", v)}
                            error={allPlayerErrors[0]}
                          />
                        </div>
                      </div>
                      <div className="w-full">
                        <label htmlFor="reward-receiver" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">Reward receiver</label>
                        <RewardReceiverSelect
                          id="reward-receiver"
                          igns={rewardReceiverOptions}
                          value={rewardReceiverIGN}
                          onChange={setRewardReceiverIGN}
                          disabled={rewardReceiverOptions.length === 0}
                        />
                      </div>
                      {submitError && (
                        <div className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">{submitError}</div>
                      )}
                      {successMessage && (
                        <div className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10">{successMessage}</div>
                      )}
                      <button type="submit" disabled={submitLoading || Object.keys(allPlayerErrors).length > 0} className="btn-gradient w-full py-3 sm:w-auto sm:min-w-[220px]">
                        {submitLoading ? "Registering…" : "Register"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
                      <div className="w-full">
                        <h3 className="mb-4 text-sm font-medium text-slate-600 dark:text-slate-300">All players (Minecraft IGN & Discord)</h3>
                        {playersCheckLoading && players.some((p) => (p.minecraftIGN || "").trim() && (p.discordUsername || "").trim()) && (
                          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Checking if any player is already registered…</p>
                        )}
                        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                          {players.map((player, idx) => (
                            <PlayerRow
                              key={idx}
                              index={idx}
                              minecraftIGN={player.minecraftIGN}
                              discordUsername={player.discordUsername}
                              onIGNChange={(v) => updatePlayer(idx, "minecraftIGN", v)}
                              onDiscordChange={(v) => updatePlayer(idx, "discordUsername", v)}
                              error={allPlayerErrors[idx]}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="w-full">
                        <label htmlFor="reward-receiver" className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">Reward receiver</label>
                        <RewardReceiverSelect
                          id="reward-receiver"
                          igns={rewardReceiverOptions}
                          value={rewardReceiverIGN}
                          onChange={setRewardReceiverIGN}
                          disabled={rewardReceiverOptions.length === 0}
                        />
                      </div>
                      {submitError && (
                        <div className="w-full rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">{submitError}</div>
                      )}
                      {successMessage && (
                        <div className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10">{successMessage}</div>
                      )}
                      <button type="submit" disabled={submitLoading || Object.keys(allPlayerErrors).length > 0} className="btn-gradient w-full py-3 sm:w-auto sm:min-w-[220px]">
                        {submitLoading ? "Registering…" : "Register"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>

            <aside className="w-full shrink-0 lg:w-80 lg:sticky lg:top-6">
              <div className="card-glass w-full p-5 sm:p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Slots & info
                </h3>
                <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-medium">Remaining slots:</span>{" "}
                    {Math.max(0, selectedTournament.maxTeams - selectedTournament.registeredTeams)} / {selectedTournament.maxTeams}
                  </p>
                </div>
                <div className="mt-5 border-t border-white/10 pt-5 dark:border-white/10">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Rules
                  </p>
                  <ul className="mt-3 list-inside list-disc space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <li>{(selectedTournament.teamSize === 1 ? "Your" : "Team")} name must be unique for this tournament.</li>
                    <li>Each player needs Minecraft IGN and Discord.</li>
                    <li>One player is the reward receiver.</li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

import mongoose from "mongoose";
import Tournament from "@/models/Tournament";
import Round from "@/models/Round";
import Team from "@/models/Team";
import User from "@/models/User";

type DiscordRole = { id: string; name: string };

type AssignResult = {
  ok: boolean;
  reason?: string;
  tournamentPrefix?: string;
  playerRoleName?: string;
  championRoleName?: string;
  assignedPlayerRole: number;
  assignedChampionRole: number;
  skippedNoDiscord: number;
  skippedNoUserId: number;
  errors: number;
};

const DISCORD_API_BASE = "https://discord.com/api/v10";

let cachedRoles: { at: number; roles: DiscordRole[] } | null = null;

function parseTournamentPrefix(tournamentName: string): string | null {
  const name = (tournamentName ?? "").trim().toUpperCase();
  // Accept: "S1 MATCH 1", "S1  MATCH   1"
  const m = /^S(\d+)\s+MATCH\s+(\d+)$/.exec(name);
  if (!m) return null;
  return `S${Number(m[1])} M${Number(m[2])}`;
}

async function fetchGuildRoles(guildId: string, botToken: string): Promise<DiscordRole[]> {
  const now = Date.now();
  if (cachedRoles && now - cachedRoles.at < 30_000) return cachedRoles.roles;

  const res = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord roles fetch failed: ${res.status} ${text}`);
  }
  const json = (await res.json().catch(() => null)) as unknown;
  const roles = Array.isArray(json)
    ? (json as { id?: unknown; name?: unknown }[])
        .map((r) => ({ id: String(r.id ?? ""), name: String(r.name ?? "") }))
        .filter((r) => r.id && r.name)
    : [];

  cachedRoles = { at: now, roles };
  return roles;
}

async function addRoleToMember(guildId: string, discordUserId: string, roleId: string, botToken: string) {
  const res = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );
  if (res.status === 204) return;
  const text = await res.text().catch(() => "");
  throw new Error(`Discord add role failed: ${res.status} ${text}`);
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<{ errors: number }> {
  let idx = 0;
  let errors = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (idx < items.length) {
      const current = items[idx++];
      try {
        await fn(current);
      } catch {
        errors += 1;
      }
    }
  });
  await Promise.all(workers);
  return { errors };
}

export async function assignDiscordRolesForCompletedTournament(
  tournamentId: string
): Promise<AssignResult> {
  const botToken = process.env.DISCORD_BOT_TOKEN ?? "";
  const guildId = process.env.DISCORD_GUILD_ID ?? "";
  if (!botToken || !guildId) {
    return {
      ok: false,
      reason: "Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID",
      assignedPlayerRole: 0,
      assignedChampionRole: 0,
      skippedNoDiscord: 0,
      skippedNoUserId: 0,
      errors: 0,
    };
  }

  if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
    return {
      ok: false,
      reason: "Invalid tournamentId",
      assignedPlayerRole: 0,
      assignedChampionRole: 0,
      skippedNoDiscord: 0,
      skippedNoUserId: 0,
      errors: 0,
    };
  }

  const tournament = await Tournament.findById(tournamentId)
    .select("name winnerTeamId status discordRolesAssignedAt")
    .lean();
  const t = tournament as
    | {
        name?: string;
        winnerTeamId?: mongoose.Types.ObjectId;
        status?: string;
        discordRolesAssignedAt?: Date;
      }
    | null;

  if (!t) {
    return {
      ok: false,
      reason: "Tournament not found",
      assignedPlayerRole: 0,
      assignedChampionRole: 0,
      skippedNoDiscord: 0,
      skippedNoUserId: 0,
      errors: 0,
    };
  }

  if (t.discordRolesAssignedAt) {
    return {
      ok: true,
      reason: "Already assigned",
      assignedPlayerRole: 0,
      assignedChampionRole: 0,
      skippedNoDiscord: 0,
      skippedNoUserId: 0,
      errors: 0,
    };
  }

  if (t.status !== "completed" || !t.winnerTeamId) {
    return {
      ok: false,
      reason: "Tournament is not completed or winnerTeamId missing",
      assignedPlayerRole: 0,
      assignedChampionRole: 0,
      skippedNoDiscord: 0,
      skippedNoUserId: 0,
      errors: 0,
    };
  }

  const prefix = parseTournamentPrefix(t.name ?? "");
  if (!prefix) {
    return {
      ok: false,
      reason: "Tournament name must match: S# MATCH # (e.g. S1 MATCH 1)",
      assignedPlayerRole: 0,
      assignedChampionRole: 0,
      skippedNoDiscord: 0,
      skippedNoUserId: 0,
      errors: 0,
    };
  }

  const playerRoleName = `${prefix} Player`;
  const championRoleName = `${prefix} Champion`;

  const roles = await fetchGuildRoles(guildId, botToken);
  const playerRole = roles.find((r) => r.name.trim().toLowerCase() === playerRoleName.toLowerCase());
  const championRole = roles.find((r) => r.name.trim().toLowerCase() === championRoleName.toLowerCase());
  if (!playerRole || !championRole) {
    return {
      ok: false,
      reason: `Missing Discord roles. Create roles named "${playerRoleName}" and "${championRoleName}".`,
      tournamentPrefix: prefix,
      playerRoleName,
      championRoleName,
      assignedPlayerRole: 0,
      assignedChampionRole: 0,
      skippedNoDiscord: 0,
      skippedNoUserId: 0,
      errors: 0,
    };
  }

  // Participant teams = appeared in any round.teamIds.
  const rounds = await Round.find({ tournamentId: new mongoose.Types.ObjectId(tournamentId) })
    .select("teamIds")
    .lean();
  const participantTeamIds = Array.from(
    new Set(
      rounds
        .flatMap((r) => (r as unknown as { teamIds?: mongoose.Types.ObjectId[] }).teamIds ?? [])
        .map((oid) => oid.toString())
        .filter(Boolean)
    )
  );

  const teams = participantTeamIds.length
    ? await Team.find({ _id: { $in: participantTeamIds.map((s) => new mongoose.Types.ObjectId(s)) } })
        .select("captainId players.userId")
        .lean()
    : [];

  const userIdSet = new Set<string>();
  let skippedNoUserId = 0;

  for (const team of teams as unknown as { captainId?: mongoose.Types.ObjectId; players?: { userId?: mongoose.Types.ObjectId }[] }[]) {
    if (team.captainId) userIdSet.add(team.captainId.toString());
    for (const p of team.players ?? []) {
      if (p.userId) userIdSet.add(p.userId.toString());
      else skippedNoUserId += 1;
    }
  }

  const winnerTeam = await Team.findById(t.winnerTeamId)
    .select("captainId players.userId")
    .lean();
  const winnerUserIdSet = new Set<string>();
  if (winnerTeam) {
    const wt = winnerTeam as unknown as { captainId?: mongoose.Types.ObjectId; players?: { userId?: mongoose.Types.ObjectId }[] };
    if (wt.captainId) winnerUserIdSet.add(wt.captainId.toString());
    for (const p of wt.players ?? []) {
      if (p.userId) winnerUserIdSet.add(p.userId.toString());
      else skippedNoUserId += 1;
    }
  }

  const allUserIds = Array.from(userIdSet);
  const users = allUserIds.length
    ? await User.find({ _id: { $in: allUserIds.map((s) => new mongoose.Types.ObjectId(s)) } })
        .select("_id discordId")
        .lean()
    : [];

  const discordByUserId = new Map(
    (users as unknown as { _id: mongoose.Types.ObjectId; discordId?: string }[])
      .map((u): [string, string] => [u._id.toString(), (u.discordId ?? "").toString().trim()])
      .filter(([, did]) => !!did)
  );

  const participantDiscordIds: string[] = [];
  let skippedNoDiscord = 0;
  for (const uid of Array.from(userIdSet)) {
    const did = discordByUserId.get(uid);
    if (did) participantDiscordIds.push(did);
    else skippedNoDiscord += 1;
  }

  const winnerDiscordIds: string[] = [];
  for (const uid of Array.from(winnerUserIdSet)) {
    const did = discordByUserId.get(uid);
    if (did) winnerDiscordIds.push(did);
    else skippedNoDiscord += 1;
  }

  // Assign roles (best-effort). Use small concurrency to respect rate limits.
  const uniqueParticipantDiscordIds = Array.from(new Set(participantDiscordIds));
  const uniqueWinnerDiscordIds = Array.from(new Set(winnerDiscordIds));

  const playerAssign = await runPool(uniqueParticipantDiscordIds, 3, async (discordUserId) => {
    await addRoleToMember(guildId, discordUserId, playerRole.id, botToken);
  });
  const championAssign = await runPool(uniqueWinnerDiscordIds, 3, async (discordUserId) => {
    await addRoleToMember(guildId, discordUserId, championRole.id, botToken);
  });

  const assignedPlayerRole = Math.max(0, uniqueParticipantDiscordIds.length - playerAssign.errors);
  const assignedChampionRole = Math.max(0, uniqueWinnerDiscordIds.length - championAssign.errors);
  const errors = playerAssign.errors + championAssign.errors;

  if (assignedPlayerRole === 0 && assignedChampionRole === 0 && errors > 0) {
    return {
      ok: false,
      reason: "Discord role assignment failed",
      tournamentPrefix: prefix,
      playerRoleName,
      championRoleName,
      assignedPlayerRole,
      assignedChampionRole,
      skippedNoDiscord,
      skippedNoUserId,
      errors,
    };
  }

  await Tournament.findByIdAndUpdate(
    tournamentId,
    { $set: { discordRolesAssignedAt: new Date() } },
    { new: false }
  ).lean();

  return {
    ok: true,
    tournamentPrefix: prefix,
    playerRoleName,
    championRoleName,
    assignedPlayerRole,
    assignedChampionRole,
    skippedNoDiscord,
    skippedNoUserId,
    errors,
  };
}


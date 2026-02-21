import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import TournamentDate from "@/models/TournamentDate";
import Team, { type IPlayer } from "@/models/Team";
import { authOptions } from "@/lib/auth";

type RegisterBody = {
  teamName?: string;
  tournamentDate?: string;
  tournamentId?: string;
  players?: IPlayer[];
  rewardReceiverIGN?: string;
};

function isPlayer(obj: unknown): obj is IPlayer {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "minecraftIGN" in obj &&
    "discordUsername" in obj &&
    typeof (obj as IPlayer).minecraftIGN === "string" &&
    typeof (obj as IPlayer).discordUsername === "string"
  );
}

function validateBody(body: unknown): {
  ok: true;
  data: RegisterBody & { mode: "legacy" | "tournament" };
} | { ok: false; status: number; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Request body must be a JSON object" };
  }

  const b = body as RegisterBody;
  if (typeof b.teamName !== "string" || !b.teamName.trim()) {
    return { ok: false, status: 400, message: "teamName is required and must be a non-empty string" };
  }
  if (!Array.isArray(b.players)) {
    return { ok: false, status: 400, message: "players must be an array" };
  }
  for (let i = 0; i < b.players.length; i++) {
    if (!isPlayer(b.players[i])) {
      return {
        ok: false,
        status: 400,
        message: `players[${i}] must have minecraftIGN and discordUsername (strings)`,
      };
    }
  }
  if (typeof b.rewardReceiverIGN !== "string" || !b.rewardReceiverIGN.trim()) {
    return { ok: false, status: 400, message: "rewardReceiverIGN is required and must be a non-empty string" };
  }
  const igns = b.players.map((p) => p.minecraftIGN);
  if (!igns.includes(b.rewardReceiverIGN.trim())) {
    return { ok: false, status: 400, message: "rewardReceiverIGN must be one of the players' Minecraft IGN" };
  }
  const seenKeys = new Set<string>();
  for (let i = 0; i < b.players.length; i++) {
    const ign = (b.players[i].minecraftIGN ?? "").trim().toLowerCase();
    const discord = (b.players[i].discordUsername ?? "").trim();
    if (!ign || !discord) continue;
    const key = `${ign}|${discord}`;
    if (seenKeys.has(key)) {
      return {
        ok: false,
        status: 400,
        message: `Same Minecraft IGN and Discord cannot appear twice. Player ${i + 1} duplicates another.`,
      };
    }
    seenKeys.add(key);
  }

  const hasId = typeof b.tournamentId === "string" && b.tournamentId.trim() && mongoose.Types.ObjectId.isValid(b.tournamentId.trim());
  const hasDate = typeof b.tournamentDate === "string" && b.tournamentDate.trim();

  if (hasId && hasDate) {
    return { ok: false, status: 400, message: "Provide either tournamentId or tournamentDate, not both" };
  }
  if (hasId) {
    if (b.players.length !== 1 && b.players.length !== 2 && b.players.length !== 4) {
      return { ok: false, status: 400, message: "players must contain 1 (solo), 2 (duo), or 4 (squad) entries" };
    }
    return {
      ok: true,
      data: {
        teamName: b.teamName.trim(),
        tournamentId: b.tournamentId!.trim(),
        players: b.players,
        rewardReceiverIGN: b.rewardReceiverIGN.trim(),
        mode: "tournament" as const,
      },
    };
  }
  if (hasDate) {
    if (b.players.length !== 4) {
      return { ok: false, status: 400, message: "players must contain exactly 4 entries for legacy tournament date" };
    }
    return {
      ok: true,
      data: {
        teamName: b.teamName.trim(),
        tournamentDate: b.tournamentDate!.trim(),
        players: b.players,
        rewardReceiverIGN: b.rewardReceiverIGN.trim(),
        mode: "legacy" as const,
      },
    };
  }
  return { ok: false, status: 400, message: "tournamentId or tournamentDate is required" };
}

async function registerWithTournamentId(
  tournamentId: string,
  teamName: string,
  players: IPlayer[],
  rewardReceiverIGN: string,
  captainId: string | null
) {
  const tournament = await Tournament.findById(tournamentId).lean();
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  const t = tournament as unknown as {
    status: string;
    isClosed: boolean;
    registeredTeams: number;
    maxTeams: number;
    teamSize: number;
  };
  if (t.status !== "registration_open") {
    return NextResponse.json(
      { error: "Registration is not open for this tournament" },
      { status: 400 }
    );
  }
  if (t.isClosed || t.registeredTeams >= t.maxTeams) {
    return NextResponse.json(
      { error: "No slots remaining for this tournament" },
      { status: 400 }
    );
  }
  if (players.length !== t.teamSize) {
    return NextResponse.json(
      { error: `This tournament requires exactly ${t.teamSize} player(s). You provided ${players.length}.` },
      { status: 400 }
    );
  }

  const tournamentIdObj = new mongoose.Types.ObjectId(tournamentId);
  const existingTeam = await Team.findOne({ teamName, tournamentId: tournamentIdObj }).lean();
  const isUpdateOwn =
    existingTeam &&
    captainId &&
    (existingTeam as { captainId?: mongoose.Types.ObjectId }).captainId?.toString() === captainId;

  if (existingTeam && isUpdateOwn) {
    // Same captain re-registering same team name: update players/reward, allow same IGNs (their own)
    const otherTeams = await Team.find(
      { tournamentId: tournamentIdObj, _id: { $ne: existingTeam._id } },
      { "players.minecraftIGN": 1, "players.discordUsername": 1 }
    );
    const usedPlayerKeys = new Set<string>();
    for (const t of otherTeams) {
      for (const p of t.players) {
        usedPlayerKeys.add(`${(p.minecraftIGN || "").trim().toLowerCase()}|${(p.discordUsername || "").trim()}`);
      }
    }
    const duplicate = players.find(
      (p) => usedPlayerKeys.has(`${(p.minecraftIGN || "").trim().toLowerCase()}|${(p.discordUsername || "").trim()}`)
    );
    if (duplicate) {
      return NextResponse.json(
        { error: `A player with Minecraft IGN "${duplicate.minecraftIGN}" and that Discord is already on another team for this tournament.` },
        { status: 409 }
      );
    }
    await Team.updateOne(
      { _id: existingTeam._id },
      { $set: { players, rewardReceiverIGN } }
    );
    return NextResponse.json(
      {
        success: true,
        message: "Team updated successfully",
        teamId: (existingTeam as { _id: mongoose.Types.ObjectId })._id.toString(),
      },
      { status: 200 }
    );
  }

  if (existingTeam) {
    return NextResponse.json(
      { error: "Team name already registered for this tournament" },
      { status: 409 }
    );
  }

  // One team per user per tournament: block if this user is already in a team (captain or player)
  if (captainId) {
    const existingUserTeam = await Team.findOne({
      tournamentId: tournamentIdObj,
      $or: [
        { captainId: new mongoose.Types.ObjectId(captainId) },
        { "players.userId": new mongoose.Types.ObjectId(captainId) },
      ],
    });
    if (existingUserTeam) {
      return NextResponse.json(
        { error: "You are already on a team for this tournament. Each player can only be on one team per tournament." },
        { status: 409 }
      );
    }
  }

  // Same IGN is allowed if Discord is different (different people). Block only when IGN + Discord both match.
  const existingTeams = await Team.find(
    { tournamentId: tournamentIdObj },
    { "players.minecraftIGN": 1, "players.discordUsername": 1 }
  );
  const usedPlayerKeys = new Set<string>();
  for (const t of existingTeams) {
    for (const p of t.players) {
      usedPlayerKeys.add(`${(p.minecraftIGN || "").trim().toLowerCase()}|${(p.discordUsername || "").trim()}`);
    }
  }
  const duplicate = players.find(
    (p) => usedPlayerKeys.has(`${(p.minecraftIGN || "").trim().toLowerCase()}|${(p.discordUsername || "").trim()}`)
  );
  if (duplicate) {
    return NextResponse.json(
      { error: `A player with Minecraft IGN "${duplicate.minecraftIGN}" and that Discord is already registered for this tournament.` },
      { status: 409 }
    );
  }

  const session = await Team.startSession();
  session.startTransaction();
  try {
    const team = await Team.create(
      [
        {
          teamName,
          tournamentId: new mongoose.Types.ObjectId(tournamentId),
          ...(captainId ? { captainId: new mongoose.Types.ObjectId(captainId) } : {}),
          players,
          rewardReceiverIGN,
          status: "pending",
        },
      ],
      { session }
    );
    await Tournament.updateOne(
      { _id: tournamentId },
      { $inc: { registeredTeams: 1 } },
      { session }
    );
    await session.commitTransaction();
    const created = team[0];
    return NextResponse.json(
      {
        success: true,
        message: "Team registered successfully",
        teamId: created._id.toString(),
        createdAt: created.createdAt,
      },
      { status: 201 }
    );
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
}

async function registerWithTournamentDate(
  tournamentDate: string,
  teamName: string,
  players: IPlayer[],
  rewardReceiverIGN: string
) {
  const tourneyDate = await TournamentDate.findOne({ date: tournamentDate });
  if (!tourneyDate) {
    return NextResponse.json({ error: "Tournament date not found" }, { status: 404 });
  }
  if (tourneyDate.isClosed) {
    return NextResponse.json(
      { error: "Registration is closed for this date" },
      { status: 400 }
    );
  }
  if (tourneyDate.registeredTeams >= tourneyDate.maxTeams) {
    return NextResponse.json(
      { error: "No slots remaining for this date" },
      { status: 400 }
    );
  }

  const existingTeamName = await Team.findOne({ teamName, tournamentDate });
  if (existingTeamName) {
    return NextResponse.json(
      { error: "Team name already registered for this date" },
      { status: 409 }
    );
  }

  const existingTeamsForDate = await Team.find(
    { tournamentDate },
    { "players.minecraftIGN": 1, "players.discordUsername": 1 }
  );
  const usedPlayerKeys = new Set<string>();
  for (const t of existingTeamsForDate) {
    for (const p of t.players) {
      usedPlayerKeys.add(`${(p.minecraftIGN || "").trim().toLowerCase()}|${(p.discordUsername || "").trim()}`);
    }
  }
  const duplicate = players.find(
    (p) => usedPlayerKeys.has(`${(p.minecraftIGN || "").trim().toLowerCase()}|${(p.discordUsername || "").trim()}`)
  );
  if (duplicate) {
    return NextResponse.json(
      { error: `A player with Minecraft IGN "${duplicate.minecraftIGN}" and that Discord is already registered for this date.` },
      { status: 409 }
    );
  }

  const session = await Team.startSession();
  session.startTransaction();
  try {
    const team = await Team.create(
      [
        {
          teamName,
          tournamentDate,
          players,
          rewardReceiverIGN,
          status: "pending",
        },
      ],
      { session }
    );
    const newCount = tourneyDate.registeredTeams + 1;
    await TournamentDate.updateOne(
      { date: tournamentDate },
      {
        $set: {
          registeredTeams: newCount,
          ...(newCount >= tourneyDate.maxTeams ? { isClosed: true } : {}),
        },
      },
      { session }
    );
    await session.commitTransaction();
    const created = team[0];
    return NextResponse.json(
      {
        success: true,
        message: "Team registered successfully",
        teamId: created._id.toString(),
        createdAt: created.createdAt,
      },
      { status: 201 }
    );
  } catch (txError) {
    await session.abortTransaction();
    throw txError;
  } finally {
    session.endSession();
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateBody(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message },
        { status: validation.status }
      );
    }

    const { teamName, players, rewardReceiverIGN, mode } = validation.data;
    await connectDB();

    if (mode === "tournament") {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "You must be signed in to register for a tournament" },
          { status: 401 }
        );
      }
      return await registerWithTournamentId(
        validation.data.tournamentId!,
        validation.data.teamName!,
        validation.data.players!,
        validation.data.rewardReceiverIGN!,
        session.user.id
      );
    }
    return await registerWithTournamentDate(
      validation.data.tournamentDate!,
      validation.data.teamName!,
      validation.data.players!,
      validation.data.rewardReceiverIGN!
    );
  } catch (err) {
    console.error("Register API error:", err);
    return NextResponse.json(
      { error: "An error occurred while processing registration" },
      { status: 500 }
    );
  }
}

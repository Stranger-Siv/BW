import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team, { type IPlayer } from "@/models/Team";
import { authOptions } from "@/lib/auth";

function isAdmin(session: { user?: { role?: string } } | null): boolean {
  return session?.user?.role === "admin";
}

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

type AddTeamBody = {
  teamName?: string;
  players?: unknown[];
  rewardReceiverIGN?: string;
};

function validateBody(
  body: unknown,
  teamSize: number
): { ok: true; data: { teamName: string; players: IPlayer[]; rewardReceiverIGN: string } } | { ok: false; status: number; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Request body must be a JSON object" };
  }
  const b = body as AddTeamBody;
  if (typeof b.teamName !== "string" || !b.teamName.trim()) {
    return { ok: false, status: 400, message: "teamName is required and must be a non-empty string" };
  }
  if (!Array.isArray(b.players) || b.players.length !== teamSize) {
    return { ok: false, status: 400, message: `players must contain exactly ${teamSize} entries` };
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
  const igns = (b.players as IPlayer[]).map((p) => (p.minecraftIGN ?? "").trim());
  if (!igns.includes(b.rewardReceiverIGN.trim())) {
    return { ok: false, status: 400, message: "rewardReceiverIGN must be one of the players' Minecraft IGN" };
  }
  const seenKeys = new Set<string>();
  for (let i = 0; i < (b.players as IPlayer[]).length; i++) {
    const p = (b.players as IPlayer[])[i];
    const ign = (p.minecraftIGN ?? "").trim().toLowerCase();
    const discord = (p.discordUsername ?? "").trim();
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
  const players = (b.players as IPlayer[]).map((p) => ({
    minecraftIGN: (p.minecraftIGN ?? "").trim(),
    discordUsername: (p.discordUsername ?? "").trim(),
  }));
  return {
    ok: true,
    data: {
      teamName: b.teamName.trim(),
      players,
      rewardReceiverIGN: b.rewardReceiverIGN.trim(),
    },
  };
}

/**
 * POST /api/admin/tournaments/[id]/teams
 * Add a team manually (e.g. staff/guest). Admin only.
 * Body: { teamName, players: [{ minecraftIGN, discordUsername }], rewardReceiverIGN }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    await connectDB();
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const t = tournament as unknown as { teamSize: number; registeredTeams: number; maxTeams: number; isClosed: boolean };
    const validation = validateBody(body, t.teamSize);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: validation.status });
    }

    if (t.isClosed) {
      return NextResponse.json(
        { error: "Tournament is closed. Cannot add teams." },
        { status: 400 }
      );
    }
    if (t.registeredTeams >= t.maxTeams) {
      return NextResponse.json(
        { error: "No slots remaining for this tournament." },
        { status: 400 }
      );
    }

    const { teamName, players, rewardReceiverIGN } = validation.data;
    const tournamentIdObj = new mongoose.Types.ObjectId(id);

    const existingTeam = await Team.findOne({ teamName, tournamentId: tournamentIdObj });
    if (existingTeam) {
      return NextResponse.json(
        { error: "Team name already registered for this tournament." },
        { status: 409 }
      );
    }

    // Build set of (IGN + Discord) already registered in this tournament (any team)
    const existingTeams = await Team.find(
      { tournamentId: tournamentIdObj },
      { players: 1 }
    ).lean();
    const usedPlayerKeys = new Set<string>();
    for (const team of existingTeams) {
      const list = (team as { players?: unknown[] }).players ?? [];
      for (const p of list) {
        const ign = (p as Record<string, unknown>).minecraftIGN;
        const discord = (p as Record<string, unknown>).discordUsername;
        const ignStr = typeof ign === "string" ? ign.trim().toLowerCase() : "";
        const discordStr = typeof discord === "string" ? discord.trim() : "";
        if (ignStr && discordStr) usedPlayerKeys.add(`${ignStr}|${discordStr}`);
      }
    }
    const duplicate = players.find((p) => {
      const key = `${p.minecraftIGN.trim().toLowerCase()}|${p.discordUsername.trim()}`;
      return usedPlayerKeys.has(key);
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: `A player with Minecraft IGN "${duplicate.minecraftIGN}" and that Discord is already registered for this tournament. Each player can only be on one team.`,
        },
        { status: 409 }
      );
    }

    const [created] = await Team.create([
      {
        teamName,
        tournamentId: tournamentIdObj,
        players,
        rewardReceiverIGN,
        status: "pending",
      },
    ]);
    await Tournament.updateOne(
      { _id: id },
      { $inc: { registeredTeams: 1 } }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Team added.",
        teamId: created._id.toString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/admin/tournaments/[id]/teams error:", err);
    return NextResponse.json(
      { error: "Failed to add team" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import Team from "@/models/Team";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";
import { getServerPusher, tournamentChannel, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";
import type { IPlayer } from "@/models/Team";

/**
 * POST /api/admin/tournaments/[id]/teams/demo
 * Super admin only. Add demo teams for testing (16 or 32).
 * Body: { count: 16 | 32 }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden. Super admin only." }, { status: 403 });
    }
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    let body: { count?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const count = body.count === 16 || body.count === 32 ? body.count : 16;

    await connectDB();
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const t = tournament as unknown as {
      teamSize: number;
      registeredTeams: number;
      maxTeams: number;
      isClosed: boolean;
    };

    if (t.isClosed) {
      return NextResponse.json(
        { error: "Tournament is closed. Cannot add teams." },
        { status: 400 }
      );
    }
    const remaining = Math.max(0, t.maxTeams - t.registeredTeams);
    if (remaining < count) {
      return NextResponse.json(
        { error: `Only ${remaining} slot(s) remaining. Need ${count} for this action.` },
        { status: 400 }
      );
    }

    const tournamentIdObj = new mongoose.Types.ObjectId(id);

    // Build unique player keys for each (IGN + Discord) to avoid duplicates
    const existingTeams = await Team.find(
      { tournamentId: tournamentIdObj },
      { teamName: 1, players: 1 }
    ).lean();
    const usedTeamNames = new Set(
      (existingTeams as { teamName?: string }[]).map((x) => (x.teamName ?? "").toLowerCase())
    );
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

    const teamSize = t.teamSize;
    const teamsToCreate: { teamName: string; players: IPlayer[]; rewardReceiverIGN: string }[] = [];

    for (let i = 0; i < count; i++) {
      let teamName = `Demo Team ${i + 1}`;
      let suffix = 0;
      while (usedTeamNames.has(teamName.toLowerCase())) {
        suffix++;
        teamName = `Demo Team ${i + 1}_${suffix}`;
      }
      usedTeamNames.add(teamName.toLowerCase());

      const players: IPlayer[] = [];
      for (let p = 0; p < teamSize; p++) {
        let ign = `demo_${i + 1}_p${p + 1}`;
        let discord = `demo_${i + 1}_p${p + 1}@discord`;
        let suffix2 = 0;
        while (usedPlayerKeys.has(`${ign.toLowerCase()}|${discord}`)) {
          suffix2++;
          ign = `demo_${i + 1}_p${p + 1}_${suffix2}`;
          discord = `demo_${i + 1}_p${p + 1}_${suffix2}@discord`;
        }
        usedPlayerKeys.add(`${ign.toLowerCase()}|${discord}`);
        players.push({ minecraftIGN: ign, discordUsername: discord });
      }
      teamsToCreate.push({
        teamName,
        players,
        rewardReceiverIGN: players[0].minecraftIGN,
      });
    }

    const docs = teamsToCreate.map((x) => ({
      teamName: x.teamName,
      tournamentId: tournamentIdObj,
      players: x.players,
      rewardReceiverIGN: x.rewardReceiverIGN,
      status: "pending",
    }));

    await Team.insertMany(docs);
    await Tournament.updateOne(
      { _id: id },
      { $inc: { registeredTeams: count } }
    );

    const pusher = getServerPusher();
    if (pusher) {
      pusher.trigger(tournamentChannel(id), PUSHER_EVENTS.TEAMS_CHANGED, {});
      pusher.trigger(PUSHER_CHANNELS.TOURNAMENTS, PUSHER_EVENTS.TOURNAMENTS_CHANGED, {});
    }

    return NextResponse.json(
      {
        success: true,
        message: `Added ${count} demo teams.`,
        count,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/admin/tournaments/[id]/teams/demo error:", err);
    return NextResponse.json(
      { error: "Failed to add demo teams" },
      { status: 500 }
    );
  }
}

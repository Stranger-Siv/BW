import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";

export const dynamic = "force-dynamic";

function playerKey(ign: string, discord: string): string {
  return `${(ign || "").trim().toLowerCase()}|${(discord || "").trim()}`;
}

/**
 * POST /api/tournaments/[id]/check-players
 * Body: { players: [{ minecraftIGN, discordUsername }], teamName?: string, captainId?: string }
 * Returns { taken: [{ index, minecraftIGN, discordUsername }] } for players already registered
 * in this tournament. If teamName and captainId are provided, excludes that team so the captain
 * can re-edit their own team without flagging their own players.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
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
  if (typeof body !== "object" || body === null || !Array.isArray((body as { players?: unknown }).players)) {
    return NextResponse.json({ error: "Body must include players array" }, { status: 400 });
  }
  const b = body as {
    players: { minecraftIGN?: string; discordUsername?: string }[];
    teamName?: string;
    captainId?: string;
  };
  const teamName = typeof b.teamName === "string" ? b.teamName.trim() : undefined;
  const captainId = typeof b.captainId === "string" && b.captainId.trim() ? b.captainId.trim() : undefined;

  try {
    await connectDB();
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const tournamentIdObj = new mongoose.Types.ObjectId(id);
    let teams = await Team.find(
      { tournamentId: tournamentIdObj },
      { teamName: 1, captainId: 1, "players.minecraftIGN": 1, "players.discordUsername": 1 }
    ).lean();

    if (teamName && captainId) {
      teams = teams.filter(
        (t) =>
          (t as { teamName?: string }).teamName !== teamName ||
          (t as { captainId?: mongoose.Types.ObjectId }).captainId?.toString() !== captainId
      );
    }

    const usedKeys = new Set<string>();
    for (const t of teams) {
      const players = (t as { players?: { minecraftIGN?: string; discordUsername?: string }[] }).players ?? [];
      for (const p of players) {
        usedKeys.add(playerKey(p.minecraftIGN ?? "", p.discordUsername ?? ""));
      }
    }

    const taken: { index: number; minecraftIGN: string; discordUsername: string }[] = [];
    const list = b.players ?? [];
    for (let i = 0; i < list.length; i++) {
      const ign = (list[i]?.minecraftIGN ?? "").trim();
      const discord = (list[i]?.discordUsername ?? "").trim();
      if (!ign || !discord) continue;
      if (usedKeys.has(playerKey(ign, discord))) {
        taken.push({ index: i, minecraftIGN: ign, discordUsername: discord });
      }
    }

    return NextResponse.json({ taken });
  } catch (err) {
    console.error("POST /api/tournaments/[id]/check-players error:", err);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}

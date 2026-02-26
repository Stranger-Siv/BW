import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";

/**
 * Public detail for one team in a tournament (for slot click modal).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id?: string; teamId?: string }> }
) {
  try {
    const { id, teamId } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id) || !teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return NextResponse.json({ error: "Invalid tournament or team ID" }, { status: 400 });
    }
    await connectDB();
    const tournament = await Tournament.findById(id).select("winnerTeamId").lean();
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const team = await Team.findOne({ _id: teamId, tournamentId: id })
      .select("teamName createdAt players rewardReceiverIGN")
      .lean();
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const rounds = await Round.find({ tournamentId: id }).sort({ roundNumber: 1 }).lean();
    let roundInfo: { roundNumber: number; name: string } | null = null;
    const tidStr = teamId;
    for (const r of rounds) {
      const rDoc = r as unknown as { roundNumber: number; name: string; teamIds: mongoose.Types.ObjectId[] };
      if (rDoc.teamIds.some((oid) => oid.toString() === tidStr)) {
        roundInfo = { roundNumber: rDoc.roundNumber, name: rDoc.name };
        break;
      }
    }
    const winnerTeamId = (tournament as unknown as { winnerTeamId?: mongoose.Types.ObjectId })?.winnerTeamId;
    const isWinner = winnerTeamId?.toString() === teamId;
    const t = team as unknown as {
      teamName: string;
      createdAt: Date;
      players: { minecraftIGN: string; discordUsername: string }[];
      rewardReceiverIGN: string;
    };
    return NextResponse.json(
      {
        teamName: t.teamName,
        createdAt: t.createdAt,
        players: t.players ?? [],
        rewardReceiverIGN: t.rewardReceiverIGN ?? "",
        roundInfo,
        isWinner: !!isWinner,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/tournaments/[id]/teams/[teamId] error:", err);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

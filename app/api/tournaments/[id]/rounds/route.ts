import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    await connectDB();
    const rounds = await Round.find({ tournamentId: id })
      .sort({ roundNumber: 1 })
      .lean();
    const teamIds = rounds.flatMap((r) => (r as { teamIds: mongoose.Types.ObjectId[] }).teamIds);
    const teams = await Team.find({ _id: { $in: teamIds } })
      .select("_id teamName")
      .lean();
    const teamMap = new Map(
      (teams as unknown as { _id: { toString(): string }; teamName: string }[]).map((t) => [t._id.toString(), t.teamName])
    );
    const roundsResult = rounds.map((r) => {
      const rDoc = r as { _id: unknown; roundNumber: number; name: string; scheduledAt?: Date; teamIds: mongoose.Types.ObjectId[] };
      return {
        _id: rDoc._id,
        roundNumber: rDoc.roundNumber,
        name: rDoc.name,
        scheduledAt: rDoc.scheduledAt,
        teamIds: rDoc.teamIds.map((tid) => tid.toString()),
        teams: rDoc.teamIds.map((tid) => ({ id: tid.toString(), name: teamMap.get(tid.toString()) ?? "—" })),
      };
    });

    const tournament = await Tournament.findById(id).select("winnerTeamId").lean();
    const winnerTeamId = (tournament as { winnerTeamId?: mongoose.Types.ObjectId } | null)?.winnerTeamId;
    let winner: { teamName: string; rewardReceiverIGN: string; players: { minecraftIGN: string; discordUsername: string }[] } | null = null;
    if (winnerTeamId) {
      const winnerTeam = await Team.findById(winnerTeamId)
        .select("teamName rewardReceiverIGN players")
        .lean();
      if (winnerTeam) {
        const wt = winnerTeam as { teamName: string; rewardReceiverIGN: string; players: { minecraftIGN: string; discordUsername: string }[] };
        winner = {
          teamName: wt.teamName,
          rewardReceiverIGN: wt.rewardReceiverIGN,
          players: wt.players ?? [],
        };
      }
    }

    return NextResponse.json(
      winner ? { rounds: roundsResult, winner } : { rounds: roundsResult },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET public rounds error:", err);
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
  }
}

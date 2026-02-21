import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
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
    const tournament = await Tournament.findById(id).select("winnerTeamId").lean();
    const winnerTeamId = (tournament as { winnerTeamId?: mongoose.Types.ObjectId } | null)?.winnerTeamId;
    if (!winnerTeamId) {
      return NextResponse.json({ error: "No winner set" }, { status: 404 });
    }
    const winnerTeam = await Team.findById(winnerTeamId)
      .select("teamName rewardReceiverIGN players")
      .lean();
    if (!winnerTeam) {
      return NextResponse.json({ error: "Winner team not found" }, { status: 404 });
    }
    const wt = winnerTeam as {
      teamName: string;
      rewardReceiverIGN: string;
      players: { minecraftIGN: string; discordUsername: string }[];
    };
    return NextResponse.json(
      {
        teamName: wt.teamName,
        rewardReceiverIGN: wt.rewardReceiverIGN,
        players: wt.players ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET tournament winner error:", err);
    return NextResponse.json({ error: "Failed to fetch winner" }, { status: 500 });
  }
}

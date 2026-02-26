import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";

/**
 * Public list of teams for a tournament (for slot view).
 * Returns team names and createdAt, sorted by createdAt.
 */
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
    const tournament = await Tournament.findById(id).select("status maxTeams").lean();
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const teams = await Team.find({ tournamentId: id })
      .select("_id teamName createdAt")
      .sort({ createdAt: 1 })
      .lean();
    const status = (tournament as unknown as { status: string }).status ?? "draft";
    const list = (teams as unknown as { _id: mongoose.Types.ObjectId; teamName: string; createdAt: Date }[]).map(
      (t) => ({
        _id: t._id.toString(),
        teamName: t.teamName,
        createdAt: t.createdAt,
      })
    );
    return NextResponse.json({ teams: list, status }, { status: 200 });
  } catch (err) {
    console.error("GET /api/tournaments/[id]/teams error:", err);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}

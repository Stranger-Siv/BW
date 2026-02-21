import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import TournamentDate from "@/models/TournamentDate";
import Team from "@/models/Team";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const tournamentId = searchParams.get("tournamentId");

    await connectDB();

    if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) {
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return NextResponse.json(
          { error: "Tournament not found" },
          { status: 404 }
        );
      }
      const teams = await Team.find({ tournamentId: new mongoose.Types.ObjectId(tournamentId) })
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json(teams, { status: 200 });
    }

    if (date && typeof date === "string" && date.trim()) {
      const dateTrimmed = date.trim();
      const tourneyDate = await TournamentDate.findOne({ date: dateTrimmed });
      if (!tourneyDate) {
        return NextResponse.json(
          { error: "Tournament date not found" },
          { status: 404 }
        );
      }
      const teams = await Team.find({ tournamentDate: dateTrimmed })
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json(teams, { status: 200 });
    }

    return NextResponse.json(
      { error: "Query parameter 'date' or 'tournamentId' is required" },
      { status: 400 }
    );
  } catch (err) {
    console.error("GET /api/admin/teams error:", err);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

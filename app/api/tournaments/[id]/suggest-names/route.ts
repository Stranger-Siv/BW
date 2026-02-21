import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";

export const dynamic = "force-dynamic";

const CANDIDATES = [
  "Team Alpha",
  "Team Omega",
  "Dragon Slayers",
  "Squad One",
  "Night Owls",
  "Storm Chasers",
  "Phoenix Rising",
  "Shadow Squad",
  "Team Victory",
  "Elite Force",
  "Team Spirit",
  "Thunder Strike",
  "Team Nexus",
  "Frost Legends",
  "Blaze Squad",
];

/**
 * GET /api/tournaments/[id]/suggest-names?limit=5
 * Returns up to `limit` team names that are available for this tournament.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const { id } = await params;
  const limit = Math.min(10, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "5", 10) || 5));
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid tournament ID" }, { status: 400 });
  }
  try {
    await connectDB();
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }
    const tournamentId = new mongoose.Types.ObjectId(id);
    const existing = await Team.find({ tournamentId })
      .select("teamName")
      .lean();
    const existingNames = existing as unknown as { teamName: string }[];
    const taken = new Set(existingNames.map((t) => t.teamName.trim().toLowerCase()));
    const shuffled = [...CANDIDATES].sort(() => Math.random() - 0.5);
    const suggestions: string[] = [];
    for (const name of shuffled) {
      if (suggestions.length >= limit) break;
      if (!name.trim()) continue;
      if (!taken.has(name.trim().toLowerCase())) {
        suggestions.push(name);
      }
    }
    while (suggestions.length < limit) {
      const extra = `Team ${Math.floor(Math.random() * 9000) + 1000}`;
      if (!taken.has(extra.toLowerCase())) {
        suggestions.push(extra);
        taken.add(extra.toLowerCase());
      }
    }
    return Response.json({ suggestions: suggestions.slice(0, limit) });
  } catch (err) {
    console.error("GET /api/tournaments/[id]/suggest-names error:", err);
    return Response.json({ error: "Failed to suggest names" }, { status: 500 });
  }
}

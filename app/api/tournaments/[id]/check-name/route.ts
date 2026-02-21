import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";

export const dynamic = "force-dynamic";

/**
 * GET /api/tournaments/[id]/check-name?name=TeamName
 * Returns { available: true } if the name is not taken for this tournament, else { available: false }.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const { id } = await params;
  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid tournament ID" }, { status: 400 });
  }
  if (!name) {
    return Response.json({ available: true });
  }
  try {
    await connectDB();
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }
    const existing = await Team.findOne({
      tournamentId: new mongoose.Types.ObjectId(id),
      teamName: name,
    }).lean();
    return Response.json({ available: !existing });
  } catch (err) {
    console.error("GET /api/tournaments/[id]/check-name error:", err);
    return Response.json({ error: "Check failed" }, { status: 500 });
  }
}

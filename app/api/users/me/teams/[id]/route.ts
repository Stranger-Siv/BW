import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid team ID" }, { status: 400 });
  }
  try {
    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const team = await Team.findOne({
      _id: id,
      $or: [{ captainId: userId }, { "players.userId": userId }],
    })
      .populate("captainId", "name displayName email image")
      .populate("players.userId", "name displayName email minecraftIGN discordUsername")
      .populate("tournamentId", "name date teamSize status")
      .lean();
    if (!team) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }
    return Response.json(team, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/users/me/teams/[id] error:", err);
    return Response.json({ error: "Failed to load team" }, { status: 500 });
  }
}

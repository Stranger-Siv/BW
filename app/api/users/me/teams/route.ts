import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const teams = await Team.find({
      $or: [{ captainId: userId }, { "players.userId": userId }],
    })
      .select("_id teamName tournamentId status")
      .populate("tournamentId", "name date")
      .sort({ createdAt: -1 })
      .lean();
    return Response.json(teams);
  } catch (err) {
    console.error("GET /api/users/me/teams error:", err);
    return Response.json({ error: "Failed to load teams" }, { status: 500 });
  }
}

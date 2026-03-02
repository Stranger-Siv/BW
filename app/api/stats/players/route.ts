import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();

    const result = await Team.aggregate<{ totalPlayers: number }>([
      { $match: { status: "approved" } },
      { $project: { count: { $size: "$players" } } },
      { $group: { _id: null, totalPlayers: { $sum: "$count" } } },
    ]);

    const totalPlayers = result[0]?.totalPlayers ?? 0;

    return NextResponse.json(
      { totalPlayers },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.error("GET /api/stats/players error:", err);
    return NextResponse.json(
      { totalPlayers: 0 },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}


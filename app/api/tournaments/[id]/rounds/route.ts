import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import Team from "@/models/Team";


export async function GET(
  _request: Request,
  { params }: { params: { id?: string } }
) {
  try {
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    await connectDB();
    const rounds = await Round.find({ tournamentId: id })
      .sort({ roundNumber: 1 })
      .lean();
    const teamIds = rounds.flatMap((r) => r.teamIds);
    const teams = await Team.find({ _id: { $in: teamIds } })
      .select("_id teamName")
      .lean();
    const teamMap = new Map(
      (teams as unknown as { _id: { toString(): string }; teamName: string }[]).map((t) => [t._id.toString(), t.teamName])
    );
    const result = rounds.map((r) => ({
      _id: r._id,
      roundNumber: r.roundNumber,
      name: r.name,
      scheduledAt: r.scheduledAt,
      teamIds: r.teamIds.map((tid: { toString(): string }) => tid.toString()),
      teams: r.teamIds.map((tid: { toString(): string }) => ({ id: tid.toString(), name: teamMap.get(tid.toString()) ?? "—" })),
    }));
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("GET public rounds error:", err);
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
  }
}

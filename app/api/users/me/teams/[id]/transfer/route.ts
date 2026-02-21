import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: teamId } = await params;
  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
    return Response.json({ error: "Invalid team ID" }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const newCaptainIdRaw = typeof body.newCaptainUserId === "string" ? body.newCaptainUserId.trim() : "";
  if (!newCaptainIdRaw || !mongoose.Types.ObjectId.isValid(newCaptainIdRaw)) {
    return Response.json({ error: "Valid newCaptainUserId is required" }, { status: 400 });
  }
  const newCaptainId = new mongoose.Types.ObjectId(newCaptainIdRaw);
  const currentUserId = session.user.id;
  if (newCaptainIdRaw === currentUserId) {
    return Response.json({ error: "You are already the captain" }, { status: 400 });
  }
  try {
    await connectDB();
    const team = await Team.findById(teamId).lean();
    if (!team) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }
    const t = team as unknown as {
      captainId: mongoose.Types.ObjectId;
      tournamentId: mongoose.Types.ObjectId;
      players: { userId?: mongoose.Types.ObjectId }[];
    };
    if (t.captainId?.toString() !== currentUserId) {
      return Response.json({ error: "Only the captain can transfer captaincy" }, { status: 403 });
    }
    const newCaptainIsPlayer = t.players?.some(
      (p) => p.userId && p.userId.toString() === newCaptainId.toString()
    );
    if (!newCaptainIsPlayer) {
      return Response.json({ error: "The new captain must be a player on this team" }, { status: 400 });
    }
    const tournament = await Tournament.findById(t.tournamentId).lean();
    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }
    const tour = tournament as { status: string };
    if (tour.status !== "registration_open") {
      return Response.json(
        { error: "Cannot transfer captaincy after registration has closed" },
        { status: 400 }
      );
    }
    await Team.findByIdAndUpdate(teamId, { $set: { captainId: newCaptainId } });
    return Response.json({ success: true, message: "Captaincy transferred." });
  } catch (err) {
    console.error("POST /api/users/me/teams/[id]/transfer error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

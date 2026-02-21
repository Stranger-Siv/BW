import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id?: string; playerId?: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: teamId, playerId } = await params;
  if (!teamId || !mongoose.Types.ObjectId.isValid(teamId) || !playerId || !mongoose.Types.ObjectId.isValid(playerId)) {
    return Response.json({ error: "Invalid team or player ID" }, { status: 400 });
  }
  const captainId = session.user.id;
  if (captainId === playerId) {
    return Response.json({ error: "Use Leave team to withdraw; captain cannot be removed as player." }, { status: 400 });
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
      players: { userId?: mongoose.Types.ObjectId; minecraftIGN?: string }[];
      rewardReceiverIGN?: string;
    };
    if (t.captainId?.toString() !== captainId) {
      return Response.json({ error: "Only the captain can remove a player" }, { status: 403 });
    }
    const tournament = await Tournament.findById(t.tournamentId).lean();
    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }
    const tour = tournament as { status: string; teamSize: number };
    if (tour.status !== "registration_open") {
      return Response.json(
        { error: "Cannot remove players after registration has closed" },
        { status: 400 }
      );
    }
    const newPlayers = t.players.filter(
      (p) => p.userId?.toString() !== playerId
    );
    if (newPlayers.length === t.players.length) {
      return Response.json({ error: "Player not found on this team" }, { status: 404 });
    }
    const validSizes = [1, 2, 3, 4];
    const mustDisband =
      newPlayers.length === 0 ||
      (tour.teamSize === 2 && newPlayers.length === 1) ||
      !validSizes.includes(newPlayers.length);
    if (mustDisband) {
      await Team.findByIdAndDelete(teamId);
      await Tournament.updateOne(
        { _id: t.tournamentId },
        { $inc: { registeredTeams: -1 } }
      );
      return Response.json({ success: true, message: "Player removed. Team disbanded (not enough players)." });
    }
    const remainingIGNs = newPlayers.map((p) => (p.minecraftIGN ?? "").trim()).filter(Boolean);
    const newRewardReceiver = remainingIGNs.includes((t.rewardReceiverIGN ?? "").trim())
      ? t.rewardReceiverIGN
      : remainingIGNs[0] ?? "";
    const playerObjId = new mongoose.Types.ObjectId(playerId);
    await Team.findByIdAndUpdate(teamId, {
      $pull: { players: { userId: playerObjId } as unknown as Record<string, unknown> },
      $set: { rewardReceiverIGN: newRewardReceiver },
    });
    return Response.json({ success: true, message: "Player removed. Send a new invite to replace them." });
  } catch (err) {
    console.error("DELETE /api/users/me/teams/[id]/players/[playerId] error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

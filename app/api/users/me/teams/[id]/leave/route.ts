import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
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
  try {
    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const team = await Team.findById(teamId).lean();
    if (!team) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }
    const t = team as unknown as {
      captainId: mongoose.Types.ObjectId;
      tournamentId: mongoose.Types.ObjectId;
      players: { userId?: mongoose.Types.ObjectId }[];
      teamName: string;
    };
    const isCaptain = t.captainId?.toString() === userId.toString();
    const isPlayer = t.players?.some(
      (p) => p.userId && p.userId.toString() === userId.toString()
    );
    if (!isCaptain && !isPlayer) {
      return Response.json({ error: "You are not on this team" }, { status: 403 });
    }

    const tournament = await Tournament.findById(t.tournamentId).lean();
    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }
    const tour = tournament as { status: string };
    if (tour.status !== "registration_open") {
      return Response.json(
        { error: "Cannot leave after registration has closed" },
        { status: 400 }
      );
    }

    const teamSize = (tournament as { teamSize: number }).teamSize;

    if (teamSize === 1) {
      await Team.findByIdAndDelete(teamId);
      await Tournament.updateOne(
        { _id: t.tournamentId },
        { $inc: { registeredTeams: -1 } }
      );
      return Response.json({ success: true, message: "Registration withdrawn." });
    }

    if (isCaptain) {
      return Response.json(
        { error: "Captain cannot leave. Remove a teammate to replace them, or ask an admin to disband the team." },
        { status: 400 }
      );
    }

    const newPlayers = t.players.filter(
      (p) => !p.userId || p.userId.toString() !== userId.toString()
    );
    const validSizes = [1, 2, 3, 4];
    const mustDisband =
      newPlayers.length === 0 ||
      (teamSize === 2 && newPlayers.length === 1) ||
      !validSizes.includes(newPlayers.length);
    if (mustDisband) {
      await Team.findByIdAndDelete(teamId);
      await Tournament.updateOne(
        { _id: t.tournamentId },
        { $inc: { registeredTeams: -1 } }
      );
      return Response.json({
        success: true,
        message:
          newPlayers.length === 0
            ? "You have left the team."
            : "You have left the team. The team has been disbanded.",
      });
    }

    const remainingIGNs = newPlayers
      .map((p) => (p as { minecraftIGN?: string }).minecraftIGN ?? "")
      .map((s) => s.trim())
      .filter(Boolean);
    const currentReward = (team as unknown as { rewardReceiverIGN?: string }).rewardReceiverIGN ?? "";
    const newRewardReceiver = remainingIGNs.includes(currentReward.trim())
      ? currentReward
      : remainingIGNs[0] ?? "";

    await Team.findByIdAndUpdate(teamId, {
      $pull: { players: { userId } as unknown as Record<string, unknown> },
      $set: { rewardReceiverIGN: newRewardReceiver },
    });
    return Response.json({ success: true, message: "You have left the team." });
  } catch (err) {
    console.error("POST /api/users/me/teams/[id]/leave error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

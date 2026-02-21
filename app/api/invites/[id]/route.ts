import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import TeamInvite from "@/models/TeamInvite";
import Tournament from "@/models/Tournament";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id?: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = params?.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid invite ID" }, { status: 400 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action === "accept" || body.action === "reject" ? body.action : null;
    if (!action) {
      return Response.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
    }

    await connectDB();
    const invite = await TeamInvite.findById(id).lean();
    if (!invite) {
      return Response.json({ error: "Invite not found" }, { status: 404 });
    }
    const inv = invite as unknown as { toUserId: { toString(): string }; captainId: mongoose.Types.ObjectId; tournamentId: mongoose.Types.ObjectId; teamName: string; status: string };
    if (inv.toUserId.toString() !== session.user!.id) {
      return Response.json({ error: "You can only respond to invites sent to you" }, { status: 403 });
    }
    if (inv.status !== "pending") {
      return Response.json({ error: "Invite was already responded to" }, { status: 400 });
    }

    if (action === "accept") {
      const userId = new mongoose.Types.ObjectId(session.user!.id);
      const alreadyOnTeam = await Team.findOne({
        tournamentId: inv.tournamentId,
        $or: [{ captainId: userId }, { "players.userId": userId }],
      }).lean();
      if (alreadyOnTeam) {
        return Response.json(
          { error: "You are already on a team for this tournament. You cannot join another team." },
          { status: 400 }
        );
      }
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";
    await TeamInvite.findByIdAndUpdate(id, { $set: { status: newStatus } });

    if (action === "reject") {
      return Response.json({ success: true, message: "Invite declined" });
    }

    const tournament = await Tournament.findById(inv.tournamentId).lean();
    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }
    const t = tournament as unknown as { teamSize: number; registeredTeams: number; maxTeams: number; status: string };
    const existingIncompleteTeam = await Team.findOne({
      captainId: inv.captainId,
      tournamentId: inv.tournamentId,
      teamName: inv.teamName,
    }).lean();
    if (existingIncompleteTeam) {
      const teamDoc = existingIncompleteTeam as unknown as { _id: mongoose.Types.ObjectId; players: { userId?: mongoose.Types.ObjectId }[] };
      const currentSize = teamDoc.players?.length ?? 0;
      if (currentSize === t.teamSize - 1) {
        const newUserId = new mongoose.Types.ObjectId(session.user!.id);
        const alreadyOnTeam = teamDoc.players?.some((p) => p.userId?.toString() === newUserId.toString());
        if (!alreadyOnTeam) {
          const newUser = await User.findById(newUserId).select("minecraftIGN discordUsername").lean();
          const nu = newUser as { minecraftIGN?: string; discordUsername?: string } | null;
          await Team.findByIdAndUpdate(teamDoc._id, {
            $push: {
              players: {
                userId: newUserId,
                minecraftIGN: nu?.minecraftIGN ?? "",
                discordUsername: nu?.discordUsername ?? "",
              },
            },
          });
          return Response.json({ success: true, message: "You joined the team! Replacement complete." });
        }
      }
    }

    const acceptedCount = await TeamInvite.countDocuments({
      captainId: inv.captainId,
      tournamentId: inv.tournamentId,
      teamName: inv.teamName,
      status: "accepted",
    });
    const required = t.teamSize - 1;
    if (acceptedCount < required) {
      return Response.json({ success: true, message: "Invite accepted. Waiting for other teammates." });
    }

    const allAccepted = await TeamInvite.find({
      captainId: inv.captainId,
      tournamentId: inv.tournamentId,
      teamName: inv.teamName,
      status: "accepted",
    })
      .sort({ createdAt: 1 })
      .populate("toUserId")
      .lean();
    const captain = await User.findById(inv.captainId).lean();
    if (!captain) {
      return Response.json({ error: "Captain not found" }, { status: 500 });
    }
    const cap = captain as unknown as { _id: mongoose.Types.ObjectId; minecraftIGN?: string; discordUsername?: string };
    const players: { userId: mongoose.Types.ObjectId; minecraftIGN: string; discordUsername: string }[] = [
      { userId: cap._id, minecraftIGN: cap.minecraftIGN ?? "", discordUsername: cap.discordUsername ?? "" },
    ];
    for (const acc of allAccepted) {
      const toUser = (acc as unknown as { toUserId: { _id: mongoose.Types.ObjectId; minecraftIGN?: string; discordUsername?: string } }).toUserId;
      players.push({
        userId: toUser._id,
        minecraftIGN: toUser.minecraftIGN ?? "",
        discordUsername: toUser.discordUsername ?? "",
      });
    }
    const ignList = players.map((p) => p.minecraftIGN ?? "");
    const rewardReceiverIGN = ignList[0] ?? "";
    const existingTeam = await Team.findOne({
      captainId: inv.captainId,
      teamName: inv.teamName,
      tournamentId: inv.tournamentId,
    });
    if (existingTeam) {
      const ex = existingTeam as unknown as { players: { userId?: mongoose.Types.ObjectId }[] };
      if ((ex.players?.length ?? 0) >= t.teamSize) {
        return Response.json({ error: "A team with this name already exists for this tournament" }, { status: 409 });
      }
    }
    await Team.create({
      teamName: inv.teamName,
      tournamentId: inv.tournamentId,
      captainId: inv.captainId,
      players,
      rewardReceiverIGN,
      status: "pending",
    });
    await Tournament.updateOne(
      { _id: inv.tournamentId },
      { $inc: { registeredTeams: 1 } }
    );
    return Response.json({ success: true, message: "Team registered! All teammates accepted." });
  } catch (err) {
    console.error("PATCH /api/invites/[id] error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

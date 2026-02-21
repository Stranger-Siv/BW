import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import TeamInvite from "@/models/TeamInvite";
import Tournament from "@/models/Tournament";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const tournamentId = typeof body.tournamentId === "string" ? body.tournamentId.trim() : "";
    const teamName = typeof body.teamName === "string" ? body.teamName.trim() : "";
    const toUserIds = Array.isArray(body.toUserIds) ? body.toUserIds : [];

    if (!tournamentId || !mongoose.Types.ObjectId.isValid(tournamentId)) {
      return Response.json({ error: "Valid tournamentId is required" }, { status: 400 });
    }
    if (!teamName) {
      return Response.json({ error: "teamName is required" }, { status: 400 });
    }
    const validToIds = toUserIds
      .filter((id: unknown) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));
    const uniqueStrings = Array.from(new Set(validToIds.map((id: mongoose.Types.ObjectId) => id.toString()))) as string[];
    const uniqueToIds = uniqueStrings.map((id) => new mongoose.Types.ObjectId(id));

    await connectDB();
    const tournament = await Tournament.findById(tournamentId).lean();
    if (!tournament) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }
    const t = tournament as unknown as { status: string; teamSize: number; registeredTeams: number; maxTeams: number };
    if (t.status !== "registration_open") {
      return Response.json({ error: "Registration is not open for this tournament" }, { status: 400 });
    }
    if (t.registeredTeams >= t.maxTeams) {
      return Response.json({ error: "Tournament is full" }, { status: 400 });
    }
    const requiredInvites = t.teamSize - 1;
    if (uniqueToIds.length !== requiredInvites) {
      return Response.json(
        { error: `This tournament requires ${requiredInvites} teammate(s). You sent ${uniqueToIds.length}.` },
        { status: 400 }
      );
    }
    if (uniqueToIds.some((id) => id.toString() === session.user!.id)) {
      return Response.json({ error: "You cannot invite yourself" }, { status: 400 });
    }

    const captainId = new mongoose.Types.ObjectId(session.user.id);
    const tournamentIdObj = new mongoose.Types.ObjectId(tournamentId);

    // Captain can only be in one team per tournament
    const captainAlreadyInTeam = await Team.findOne({
      tournamentId: tournamentIdObj,
      $or: [
        { captainId },
        { "players.userId": captainId },
      ],
    });
    if (captainAlreadyInTeam) {
      return Response.json(
        { error: "You are already on a team for this tournament. Each player can only be on one team per tournament." },
        { status: 400 }
      );
    }

    const teamsWithTheseUsers = await Team.find({
      tournamentId: tournamentIdObj,
      $or: [
        { captainId: { $in: uniqueToIds } },
        { "players.userId": { $in: uniqueToIds } },
      ],
    })
      .select("captainId players.userId")
      .lean();
    const alreadyRegisteredIds = new Set<string>();
    for (const team of teamsWithTheseUsers) {
      const tm = team as unknown as { captainId?: { toString(): string }; players?: { userId?: { toString(): string } }[] };
      if (tm.captainId) alreadyRegisteredIds.add(tm.captainId.toString());
      for (const p of tm.players ?? []) {
        if (p.userId) alreadyRegisteredIds.add(p.userId.toString());
      }
    }
    const invitedAlreadyIn = uniqueToIds.filter((id) => alreadyRegisteredIds.has(id.toString()));
    if (invitedAlreadyIn.length > 0) {
      const users = await User.find({ _id: { $in: invitedAlreadyIn } })
        .select("name displayName")
        .lean();
      const names = (users as unknown as { name?: string; displayName?: string }[]).map(
        (u) => (u.displayName && u.displayName.trim()) || u.name || "This player"
      );
      return Response.json(
        {
          error:
            names.length === 1
              ? `${names[0]} is already on a team for this tournament.`
              : `The following are already on a team for this tournament: ${names.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const previouslyDeclined = await TeamInvite.find({
      captainId,
      tournamentId: tournamentIdObj,
      teamName,
      toUserId: { $in: uniqueToIds },
      status: "rejected",
    })
      .populate("toUserId", "name displayName")
      .lean();
    if (previouslyDeclined.length > 0) {
      const names = (previouslyDeclined as unknown as { toUserId?: { name?: string; displayName?: string } }[]).map(
        (inv) => {
          const u = inv.toUserId;
          return (u?.displayName && u.displayName.trim()) || u?.name || "This player";
        }
      );
      return Response.json(
        {
          error:
            names.length === 1
              ? `${names[0]} has already declined an invite to this team and cannot be invited again.`
              : `The following have already declined an invite to this team and cannot be invited again: ${names.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    await TeamInvite.deleteMany({
      captainId,
      tournamentId: tournamentIdObj,
      teamName,
      status: "pending",
    });
    await TeamInvite.insertMany(
      uniqueToIds.map((toUserId) => ({
        captainId,
        tournamentId: tournamentIdObj,
        teamName,
        toUserId,
        status: "pending",
      }))
    );

    const invites = await TeamInvite.find({
      captainId,
      tournamentId: tournamentIdObj,
      teamName,
    })
      .populate("toUserId", "name displayName email image minecraftIGN discordUsername")
      .lean();
    return Response.json({ success: true, invites });
  } catch (err) {
    console.error("POST /api/invites error:", err);
    return Response.json({ error: "Failed to send invites" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const type = request.nextUrl.searchParams.get("type") ?? "received"; // "received" | "sent"
  try {
    await connectDB();
    const userId = new mongoose.Types.ObjectId(session.user.id);
    if (type === "sent") {
      const tournamentId = request.nextUrl.searchParams.get("tournamentId") ?? "";
      const teamName = request.nextUrl.searchParams.get("teamName") ?? "";
      const query: { captainId: mongoose.Types.ObjectId; tournamentId?: mongoose.Types.ObjectId; teamName?: string } = { captainId: userId };
      if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId)) query.tournamentId = new mongoose.Types.ObjectId(tournamentId);
      if (teamName) query.teamName = teamName;
      const invites = await TeamInvite.find(query)
        .populate("toUserId", "name displayName email image minecraftIGN discordUsername")
        .populate("tournamentId", "name date teamSize")
        .sort({ createdAt: -1 })
        .lean();
      return Response.json(invites);
    }
    const invites = await TeamInvite.find({ toUserId: userId, status: "pending" })
      .populate("captainId", "name displayName email image")
      .populate("tournamentId", "name date teamSize")
      .sort({ createdAt: -1 })
      .lean();
    return Response.json(invites);
  } catch (err) {
    console.error("GET /api/invites error:", err);
    return Response.json({ error: "Failed to load invites" }, { status: 500 });
  }
}

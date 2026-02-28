import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import Team from "@/models/Team";
import Tournament from "@/models/Tournament";
import { authOptions } from "@/lib/auth";
import { isAdminOrSuperAdmin } from "@/lib/adminAuth";
import { notifyBracketLive } from "@/lib/discord";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOrSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    await connectDB();
    const rounds = await Round.find({ tournamentId: id })
      .sort({ roundNumber: 1 })
      .lean();
    return NextResponse.json(rounds, { status: 200 });
  } catch (err) {
    console.error("GET rounds error:", err);
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOrSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const roundNumber = typeof body.roundNumber === "number" ? body.roundNumber : undefined;
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;

    if (!name) {
      return NextResponse.json({ error: "Round name is required" }, { status: 400 });
    }

    await connectDB();
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    let num = roundNumber;
    if (num == null || !Number.isInteger(num) || num < 1) {
      const max = await Round.findOne({ tournamentId: id }).sort({ roundNumber: -1 }).select("roundNumber").lean();
      const maxNum = (max as unknown as { roundNumber?: number } | null)?.roundNumber ?? 0;
      num = maxNum + 1;
    }

    const existing = await Round.findOne({ tournamentId: id, roundNumber: num }).lean();
    if (existing) {
      return NextResponse.json(
        { error: `Round ${num} already exists. Use a different round number.` },
        { status: 409 }
      );
    }

    const round = await Round.create({
      tournamentId: id,
      roundNumber: num,
      name,
      scheduledAt: scheduledAt ?? undefined,
      teamIds: [],
    });
    if (name === "R2") {
      const tournamentName = (tournament as { name?: string }).name ?? "Tournament";
      notifyBracketLive({ tournamentId: id, tournamentName }).catch(() => {});
    }
    return NextResponse.json(round.toObject(), { status: 201 });
  } catch (err) {
    console.error("POST round error:", err);
    return NextResponse.json({ error: "Failed to create round" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOrSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const roundId = typeof body.roundId === "string" ? body.roundId : "";
    const teamIds = Array.isArray(body.teamIds) ? body.teamIds : undefined;
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const scheduledAt =
      body.scheduledAt === null
        ? null
        : body.scheduledAt != null
          ? new Date(body.scheduledAt)
          : undefined;

    if (!roundId || !mongoose.Types.ObjectId.isValid(roundId)) {
      return NextResponse.json({ error: "Valid roundId is required" }, { status: 400 });
    }

    await connectDB();
    const updates: Record<string, unknown> = {};
    if (Array.isArray(teamIds)) {
      const validIds = teamIds
        .filter((t: unknown) => typeof t === "string" && mongoose.Types.ObjectId.isValid(t))
        .map((t: string) => new mongoose.Types.ObjectId(t));
      updates.teamIds = validIds;
    }
    if (name !== undefined) updates.name = name;
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt as Date | null;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Provide at least one of: teamIds, name, scheduledAt" }, { status: 400 });
    }

    const round = await Round.findOneAndUpdate(
      { _id: roundId, tournamentId: id },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }
    return NextResponse.json(round, { status: 200 });
  } catch (err) {
    console.error("PATCH round error:", err);
    return NextResponse.json({ error: "Failed to update round" }, { status: 500 });
  }
}

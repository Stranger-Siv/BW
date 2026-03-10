import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import Team from "@/models/Team";
import User from "@/models/User";
import Tournament from "@/models/Tournament";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }
    await connectDB();
    const rounds = await Round.find({ tournamentId: id })
      .sort({ roundNumber: 1 })
      .lean();
    const teamIds = rounds.flatMap((r) => (r as unknown as { teamIds: mongoose.Types.ObjectId[] }).teamIds);
    const teams = await Team.find({ _id: { $in: teamIds } })
      .select("_id teamName")
      .lean();
    const teamMap = new Map(
      (teams as unknown as { _id: { toString(): string }; teamName: string }[]).map((t) => [t._id.toString(), t.teamName])
    );
    const roundsResult = rounds.map((r) => {
      const rDoc = r as unknown as {
        _id: unknown;
        roundNumber: number;
        name: string;
        scheduledAt?: Date;
        teamIds: mongoose.Types.ObjectId[];
        isWinnerRound?: boolean;
        slotCount?: number;
      };
      return {
        _id: rDoc._id,
        roundNumber: rDoc.roundNumber,
        name: rDoc.name,
        scheduledAt: rDoc.scheduledAt,
        teamIds: rDoc.teamIds.map((tid) => tid.toString()),
        teams: rDoc.teamIds.map((tid) => ({ id: tid.toString(), name: teamMap.get(tid.toString()) ?? "—" })),
        isWinnerRound: rDoc.isWinnerRound === true,
        slotCount: rDoc.slotCount === 2 ? 2 : 4,
      };
    });

    const tournament = await Tournament.findById(id).select("winnerTeamId").lean();
    const winnerTeamId = (tournament as unknown as { winnerTeamId?: mongoose.Types.ObjectId } | null)?.winnerTeamId;
    let winner:
      | {
          teamName: string;
          rewardReceiverIGN: string;
          players: { minecraftIGN: string; discordUsername: string; discordVerified?: boolean }[];
        }
      | null = null;
    if (winnerTeamId) {
      const winnerTeam = await Team.findById(winnerTeamId).select("teamName rewardReceiverIGN players").lean();
      if (winnerTeam) {
        const wt = winnerTeam as unknown as {
          teamName: string;
          rewardReceiverIGN: string;
          players: { userId?: mongoose.Types.ObjectId; minecraftIGN: string; discordUsername: string }[];
        };
        const userIds = Array.from(
          new Set(
            (wt.players ?? [])
              .map((p) => (p.userId ? p.userId.toString() : null))
              .filter((v): v is string => !!v)
          )
        );
        let discordByUserId = new Map<string, boolean>();
        if (userIds.length) {
          const users = await User.find({ _id: { $in: userIds } })
            .select("_id discordId")
            .lean();
          discordByUserId = new Map(
            (users as unknown as { _id: mongoose.Types.ObjectId; discordId?: string }[]).map((u) => [
              u._id.toString(),
              !!(u.discordId && String(u.discordId).trim()),
            ])
          );
        }
        winner = {
          teamName: wt.teamName,
          rewardReceiverIGN: wt.rewardReceiverIGN,
          players:
            wt.players?.map((p) => {
              const uid = p.userId ? p.userId.toString() : null;
              const verified = uid ? discordByUserId.get(uid) === true : false;
              return {
                minecraftIGN: p.minecraftIGN,
                discordUsername: p.discordUsername,
                discordVerified: verified,
              };
            }) ?? [],
        };
      }
    }

    return NextResponse.json(
      winner ? { rounds: roundsResult, winner } : { rounds: roundsResult },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET public rounds error:", err);
    return NextResponse.json({ error: "Failed to fetch rounds" }, { status: 500 });
  }
}

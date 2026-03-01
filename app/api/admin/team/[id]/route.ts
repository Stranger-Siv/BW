import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Tournament from "@/models/Tournament";
import TournamentDate from "@/models/TournamentDate";
import Team, { type IPlayer, type ITeam } from "@/models/Team";
import { authOptions } from "@/lib/auth";
import { isAdminOrSuperAdmin } from "@/lib/adminAuth";
import { getServerPusher, tournamentChannel, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

const STATUS_VALUES = ["approved", "rejected"] as const;
type StatusUpdate = (typeof STATUS_VALUES)[number];

type PatchBody = {
  status?: string;
  tournamentDate?: string;
  tournamentId?: string;
  players?: { minecraftIGN?: string; discordUsername?: string }[];
  rewardReceiverIGN?: string;
};

function validatePatchBody(
  body: unknown
): {
  ok: true;
  data: {
    status?: StatusUpdate;
    tournamentDate?: string;
    tournamentId?: string;
    players?: IPlayer[];
    rewardReceiverIGN?: string;
  };
} | { ok: false; status: number; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Request body must be a JSON object" };
  }

  const { status, tournamentDate, tournamentId, players, rewardReceiverIGN } = body as PatchBody;
  const updates: {
    status?: StatusUpdate;
    tournamentDate?: string;
    tournamentId?: string;
    players?: IPlayer[];
    rewardReceiverIGN?: string;
  } = {};

  if (status !== undefined) {
    if (typeof status !== "string" || !STATUS_VALUES.includes(status as StatusUpdate)) {
      return { ok: false, status: 400, message: "status must be exactly 'approved' or 'rejected'" };
    }
    updates.status = status as StatusUpdate;
  }

  if (tournamentDate !== undefined) {
    if (typeof tournamentDate !== "string" || !tournamentDate.trim()) {
      return { ok: false, status: 400, message: "tournamentDate must be a non-empty string" };
    }
    updates.tournamentDate = tournamentDate.trim();
  }

  if (tournamentId !== undefined) {
    if (typeof tournamentId !== "string" || !mongoose.Types.ObjectId.isValid(tournamentId)) {
      return { ok: false, status: 400, message: "tournamentId must be a valid ObjectId" };
    }
    updates.tournamentId = tournamentId;
  }

  if (players !== undefined) {
    if (!Array.isArray(players)) {
      return { ok: false, status: 400, message: "players must be an array" };
    }
    const validated: IPlayer[] = [];
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (typeof p !== "object" || p === null) {
        return { ok: false, status: 400, message: `players[${i}] must be an object with minecraftIGN and discordUsername` };
      }
      const ign = typeof p.minecraftIGN === "string" ? p.minecraftIGN.trim() : "";
      const discord = typeof p.discordUsername === "string" ? p.discordUsername.trim() : "";
      if (!ign || !discord) {
        return { ok: false, status: 400, message: `players[${i}] must have minecraftIGN and discordUsername (non-empty strings)` };
      }
      validated.push({ minecraftIGN: ign, discordUsername: discord });
    }
    updates.players = validated;
  }

  if (rewardReceiverIGN !== undefined) {
    if (typeof rewardReceiverIGN !== "string" || !rewardReceiverIGN.trim()) {
      return { ok: false, status: 400, message: "rewardReceiverIGN must be a non-empty string" };
    }
    updates.rewardReceiverIGN = rewardReceiverIGN.trim();
  }

  if (Object.keys(updates).length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Provide at least one of: status, tournamentDate, tournamentId, players, rewardReceiverIGN",
    };
  }

  return { ok: true, data: updates };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOrSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const id = typeof params?.id === "string" ? params.id : undefined;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }
    await connectDB();
    const team = await Team.findById(id)
      .populate("tournamentId", "name date status teamSize maxTeams registeredTeams isClosed")
      .lean();
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    return NextResponse.json(team, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/team/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch team" },
      { status: 500 }
    );
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

    const id = typeof params?.id === "string" ? params.id : undefined;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validatePatchBody(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message },
        { status: validation.status }
      );
    }

    const { status: statusUpdate, tournamentDate: newDate, tournamentId: newTournamentId, players: newPlayers, rewardReceiverIGN: newRewardReceiver } = validation.data;

    await connectDB();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const oldDate = team.tournamentDate;
    const oldTournamentId = team.tournamentId?.toString();

    // --- Edit players/rewardReceiver (admin only when status is pending) ---
    if (newPlayers !== undefined || newRewardReceiver !== undefined) {
      if (team.status !== "pending") {
        return NextResponse.json(
          { error: "Can only edit team members before approval. Approve or reject first, or ask a super admin." },
          { status: 400 }
        );
      }
      let teamSize = 4;
      if (team.tournamentId) {
        const t = await Tournament.findById(team.tournamentId).select("teamSize").lean();
        if (t) teamSize = (t as unknown as { teamSize?: number }).teamSize ?? 4;
      } else if (team.tournamentDate) {
        const t = await Tournament.findOne({ date: team.tournamentDate }).select("teamSize").lean();
        if (t) teamSize = (t as unknown as { teamSize?: number }).teamSize ?? 4;
      }
      const playersToUse = newPlayers ?? team.players;
      const rewardToUse = newRewardReceiver ?? team.rewardReceiverIGN;
      if (playersToUse.length !== teamSize) {
        return NextResponse.json(
          { error: `Player count must be exactly ${teamSize} for this tournament` },
          { status: 400 }
        );
      }
      const igns = playersToUse.map((p: IPlayer) => p.minecraftIGN.trim()).filter(Boolean);
      if (!igns.includes(rewardToUse.trim())) {
        return NextResponse.json(
          { error: "Reward receiver must be one of the players' Minecraft IGN" },
          { status: 400 }
        );
      }
      const otherTeamsQuery = team.tournamentId
        ? { tournamentId: team.tournamentId, _id: { $ne: id } }
        : team.tournamentDate
          ? { tournamentDate: team.tournamentDate, _id: { $ne: id } }
          : null;
      if (otherTeamsQuery) {
        const otherTeams = await Team.find(otherTeamsQuery, {
          "players.minecraftIGN": 1,
          "players.discordUsername": 1,
        }).lean();
        const usedKeys = new Set<string>();
        for (const t of otherTeams) {
          const list = (t as { players?: IPlayer[] }).players ?? [];
          for (const p of list) {
            usedKeys.add(`${(p.minecraftIGN || "").trim().toLowerCase()}|${(p.discordUsername || "").trim()}`);
          }
        }
        const dup = playersToUse.find((p: IPlayer) => usedKeys.has(`${p.minecraftIGN.trim().toLowerCase()}|${p.discordUsername.trim()}`));
        if (dup) {
          return NextResponse.json(
            { error: `Player "${dup.minecraftIGN}" with that Discord is already on another team in this tournament` },
            { status: 409 }
          );
        }
      }
      const update: Partial<ITeam> = {};
      if (newPlayers !== undefined) update.players = playersToUse;
      if (newRewardReceiver !== undefined) update.rewardReceiverIGN = rewardToUse;
      await Team.findByIdAndUpdate(id, { $set: update });
      const updated = await Team.findById(id).lean();
      return NextResponse.json(updated, { status: 200 });
    }

    // --- Status-only update (no date/tournament change) ---
    if (newDate === undefined && newTournamentId === undefined) {
      if (statusUpdate !== undefined) {
        await Team.findByIdAndUpdate(id, { $set: { status: statusUpdate } });
      }
      const updated = await Team.findById(id).lean();
      return NextResponse.json(updated, { status: 200 });
    }

    // --- Move to another Tournament (tournamentId) ---
    if (newTournamentId !== undefined) {
      const newIdObj = new mongoose.Types.ObjectId(newTournamentId);
      if (oldTournamentId === newTournamentId) {
        if (statusUpdate !== undefined) {
          await Team.findByIdAndUpdate(id, { $set: { status: statusUpdate } });
        }
        const updated = await Team.findById(id).lean();
        return NextResponse.json(updated, { status: 200 });
      }
      const newTournament = await Tournament.findById(newTournamentId);
      if (!newTournament) {
        return NextResponse.json({ error: "Target tournament not found" }, { status: 404 });
      }
      if (newTournament.isClosed) {
        return NextResponse.json({ error: "Target tournament is closed" }, { status: 400 });
      }
      if (newTournament.registeredTeams >= newTournament.maxTeams) {
        return NextResponse.json({ error: "Target tournament has no remaining slots" }, { status: 400 });
      }
      const existingName = await Team.findOne({
        teamName: team.teamName,
        tournamentId: newIdObj,
        _id: { $ne: id },
      });
      if (existingName) {
        return NextResponse.json(
          { error: "Another team with this name is already in the target tournament" },
          { status: 409 }
        );
      }
      const incomingIGNs = team.players.map((p: IPlayer) => p.minecraftIGN);
      const otherTeams = await Team.find(
        { tournamentId: newIdObj, _id: { $ne: id } },
        { "players.minecraftIGN": 1 }
      );
      const usedIGNs = new Set<string>();
      for (const t of otherTeams) {
        for (const p of t.players as IPlayer[]) {
          usedIGNs.add(p.minecraftIGN);
        }
      }
      const dup = incomingIGNs.find((ign: string) => usedIGNs.has(ign));
      if (dup) {
        return NextResponse.json(
          { error: `Player "${dup}" is already in the target tournament` },
          { status: 409 }
        );
      }
      const txSession = await Team.startSession();
      txSession.startTransaction();
      try {
        const oldTournament = oldTournamentId
          ? await Tournament.findById(oldTournamentId).session(txSession).lean()
          : null;
        const newTournamentTx = await Tournament.findById(newTournamentId).session(txSession).lean();
        if (!newTournamentTx) {
          await txSession.abortTransaction();
          return NextResponse.json({ error: "Tournament not found" }, { status: 500 });
        }
        const oldT = oldTournament as unknown as { registeredTeams: number; maxTeams: number } | null;
        if (oldT) {
          const newCountOld = Math.max(0, oldT.registeredTeams - 1);
          const wasFull = oldT.registeredTeams >= oldT.maxTeams;
          await Tournament.updateOne(
            { _id: oldTournamentId },
            {
              $set: {
                registeredTeams: newCountOld,
                ...(wasFull && newCountOld < oldT.maxTeams ? { isClosed: false } : {}),
              },
            },
            { session: txSession }
          );
        }
        const newT = newTournamentTx as unknown as { registeredTeams: number; maxTeams: number };
        const newCountNew = newT.registeredTeams + 1;
        const becomesFull = newCountNew >= newT.maxTeams;
        await Tournament.updateOne(
          { _id: newTournamentId },
          {
            $set: {
              registeredTeams: newCountNew,
              ...(becomesFull ? { isClosed: true } : {}),
            },
          },
          { session: txSession }
        );
        const teamUpdate: Partial<ITeam> = { tournamentId: newIdObj };
        if (statusUpdate !== undefined) teamUpdate.status = statusUpdate;
        await Team.findByIdAndUpdate(id, { $set: teamUpdate }, { session: txSession });
        await txSession.commitTransaction();
      } catch (e) {
        await txSession.abortTransaction();
        throw e;
      } finally {
        txSession.endSession();
      }
      const updated = await Team.findById(id).lean();
      return NextResponse.json(updated, { status: 200 });
    }

    // --- tournamentDate change (with optional status) ---
    if (newDate === oldDate) {
      // Same date: only apply status if provided
      const update: Partial<ITeam> = {};
      if (statusUpdate !== undefined) update.status = statusUpdate;
      if (Object.keys(update).length > 0) {
        await Team.findByIdAndUpdate(id, { $set: update });
      }
      const updated = await Team.findById(id).lean();
      return NextResponse.json(updated, { status: 200 });
    }

    // New date is different: validate move
    const newDateDoc = await TournamentDate.findOne({ date: newDate });
    if (!newDateDoc) {
      return NextResponse.json(
        { error: "Target tournament date not found" },
        { status: 404 }
      );
    }

    if (newDateDoc.isClosed) {
      return NextResponse.json(
        { error: "Target date is closed for registration" },
        { status: 400 }
      );
    }

    if (newDateDoc.registeredTeams >= newDateDoc.maxTeams) {
      return NextResponse.json(
        { error: "Target date has no remaining slots" },
        { status: 400 }
      );
    }

    const existingSameName = await Team.findOne({
      teamName: team.teamName,
      tournamentDate: newDate,
      _id: { $ne: id },
    });
    if (existingSameName) {
      return NextResponse.json(
        { error: "Another team with this name is already registered for the target date" },
        { status: 409 }
      );
    }

    const incomingIGNs = team.players.map((p: IPlayer) => p.minecraftIGN);
    const otherTeamsOnNewDate = await Team.find(
      { tournamentDate: newDate, _id: { $ne: id } },
      { "players.minecraftIGN": 1 }
    );
    const usedIGNs = new Set<string>();
    for (const t of otherTeamsOnNewDate) {
      for (const p of t.players as IPlayer[]) {
        usedIGNs.add(p.minecraftIGN);
      }
    }
    const duplicateIGN = incomingIGNs.find((ign: string) => usedIGNs.has(ign));
    if (duplicateIGN) {
      return NextResponse.json(
        { error: `Player "${duplicateIGN}" is already registered for the target date` },
        { status: 409 }
      );
    }

    // Perform move in a transaction
    const txSession = await Team.startSession();
    txSession.startTransaction();
    try {
      const [oldDateDoc, newDateDocInTx] = await Promise.all([
        TournamentDate.findOne({ date: oldDate }).session(txSession).lean(),
        TournamentDate.findOne({ date: newDate }).session(txSession).lean(),
      ]);

      if (!oldDateDoc || !newDateDocInTx) {
        await txSession.abortTransaction();
        return NextResponse.json(
          { error: "Tournament date record not found" },
          { status: 500 }
        );
      }

      const oldD = oldDateDoc as unknown as { registeredTeams: number; maxTeams: number };
      const newD = newDateDocInTx as unknown as { registeredTeams: number; maxTeams: number };
      const newCountOld = Math.max(0, oldD.registeredTeams - 1);
      const wasOldFull = oldD.registeredTeams >= oldD.maxTeams;

      await TournamentDate.updateOne(
        { date: oldDate },
        {
          $set: {
            registeredTeams: newCountOld,
            ...(wasOldFull && newCountOld < oldD.maxTeams ? { isClosed: false } : {}),
          },
        },
        { session: txSession }
      );

      const newCountNew = newD.registeredTeams + 1;
      const becomesNewFull = newCountNew >= newD.maxTeams;

      await TournamentDate.updateOne(
        { date: newDate },
        {
          $set: {
            registeredTeams: newCountNew,
            ...(becomesNewFull ? { isClosed: true } : {}),
          },
        },
        { session: txSession }
      );

      const teamUpdate: Partial<ITeam> = { tournamentDate: newDate };
      if (statusUpdate !== undefined) teamUpdate.status = statusUpdate;
      await Team.findByIdAndUpdate(id, { $set: teamUpdate }, { session: txSession });

      await txSession.commitTransaction();
    } catch (txErr) {
      await txSession.abortTransaction();
      throw txErr;
    } finally {
      txSession.endSession();
    }

    const updated = await Team.findById(id).lean();
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/admin/team/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update team" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOrSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = typeof params?.id === "string" ? params.id : undefined;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }

    await connectDB();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const tournamentIdForPusher = team.tournamentId?.toString?.() ?? null;

    if (team.tournamentId) {
      // Only decrement when > 0 to avoid negative; bulk deletes each $inc -1.
      await Tournament.updateOne(
        { _id: team.tournamentId, registeredTeams: { $gt: 0 } },
        { $inc: { registeredTeams: -1 } }
      );
      // Reopen registration if was full and now has slots.
      await Tournament.updateOne(
        {
          _id: team.tournamentId,
          isClosed: true,
          $expr: { $lt: ["$registeredTeams", "$maxTeams"] },
        },
        { $set: { isClosed: false } }
      );
    } else if (team.tournamentDate) {
      await TournamentDate.updateOne(
        { date: team.tournamentDate, registeredTeams: { $gt: 0 } },
        { $inc: { registeredTeams: -1 } }
      );
      await TournamentDate.updateOne(
        {
          date: team.tournamentDate,
          isClosed: true,
          $expr: { $lt: ["$registeredTeams", "$maxTeams"] },
        },
        { $set: { isClosed: false } }
      );
    }

    await Team.findByIdAndDelete(id);

    try {
      const pusher = getServerPusher();
      if (pusher && tournamentIdForPusher) {
        pusher.trigger(tournamentChannel(tournamentIdForPusher), PUSHER_EVENTS.TEAMS_CHANGED, {});
        pusher.trigger(PUSHER_CHANNELS.TOURNAMENTS, PUSHER_EVENTS.TOURNAMENTS_CHANGED, {});
      }
    } catch (pusherErr) {
      console.warn("Pusher broadcast after disband failed:", pusherErr);
    }

    return NextResponse.json(
      { success: true, message: "Team disbanded" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/admin/team/[id] error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete team";
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Failed to delete team" },
      { status: 500 }
    );
  }
}

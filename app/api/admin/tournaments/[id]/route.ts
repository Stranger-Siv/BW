import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Tournament, { type TournamentStatus, type TournamentType } from "@/models/Tournament";

const STATUS_VALUES: TournamentStatus[] = [
  "draft",
  "registration_open",
  "registration_closed",
  "ongoing",
  "completed",
];

const TYPE_VALUES: TournamentType[] = ["solo", "duo", "squad"];

type PatchBody = {
  name?: string;
  type?: string;
  date?: string;
  startTime?: string;
  registrationDeadline?: string;
  maxTeams?: number;
  teamSize?: number;
  status?: string;
  isClosed?: boolean;
  description?: string;
  prize?: string;
  serverIP?: string;
};

function validatePatchBody(
  body: unknown
): { ok: true; data: Record<string, unknown> } | { ok: false; status: number; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Request body must be a JSON object" };
  }

  const b = body as PatchBody;
  const updates: Record<string, unknown> = {};

  if (b.name !== undefined) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) return { ok: false, status: 400, message: "name cannot be empty" };
    updates.name = name;
  }
  if (b.type !== undefined) {
    if (typeof b.type !== "string" || !TYPE_VALUES.includes(b.type as TournamentType)) {
      return { ok: false, status: 400, message: "type must be one of: solo, duo, squad" };
    }
    updates.type = b.type as TournamentType;
  }
  if (b.date !== undefined) {
    const date = typeof b.date === "string" ? b.date.trim() : "";
    if (!date) return { ok: false, status: 400, message: "date is required" };
    updates.date = date;
  }
  if (b.startTime !== undefined) {
    const startTime = typeof b.startTime === "string" ? b.startTime.trim() : "";
    if (!startTime) return { ok: false, status: 400, message: "startTime is required" };
    updates.startTime = startTime;
  }
  if (b.registrationDeadline !== undefined) {
    const registrationDeadline =
      typeof b.registrationDeadline === "string" ? b.registrationDeadline.trim() : "";
    if (!registrationDeadline)
      return { ok: false, status: 400, message: "registrationDeadline is required" };
    updates.registrationDeadline = registrationDeadline;
  }
  if (b.maxTeams !== undefined) {
    if (typeof b.maxTeams !== "number" || Number.isNaN(b.maxTeams) || b.maxTeams < 1) {
      return { ok: false, status: 400, message: "maxTeams must be a positive number" };
    }
    updates.maxTeams = b.maxTeams;
  }
  if (b.teamSize !== undefined) {
    if (
      typeof b.teamSize !== "number" ||
      Number.isNaN(b.teamSize) ||
      ![1, 2, 4].includes(b.teamSize)
    ) {
      return { ok: false, status: 400, message: "teamSize must be 1 (solo), 2 (duo), or 4 (squad)" };
    }
    updates.teamSize = b.teamSize;
  }
  if (b.status !== undefined) {
    if (typeof b.status !== "string" || !STATUS_VALUES.includes(b.status as TournamentStatus)) {
      return {
        ok: false,
        status: 400,
        message: `status must be one of: ${STATUS_VALUES.join(", ")}`,
      };
    }
    updates.status = b.status;
  }
  if (b.isClosed !== undefined) {
    if (typeof b.isClosed !== "boolean") {
      return { ok: false, status: 400, message: "isClosed must be a boolean" };
    }
    updates.isClosed = b.isClosed;
  }
  if (b.description !== undefined) updates.description = String(b.description).trim() || undefined;
  if (b.prize !== undefined) updates.prize = String(b.prize).trim() || undefined;
  if (b.serverIP !== undefined) updates.serverIP = String(b.serverIP).trim() || undefined;

  if (Object.keys(updates).length === 0) {
    return {
      ok: false,
      status: 400,
      message:
        "Provide at least one of: name, type, date, startTime, registrationDeadline, maxTeams, teamSize, status, isClosed, description, prize, serverIP",
    };
  }

  return { ok: true, data: updates };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const id = typeof params?.id === "string" ? params.id : undefined;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
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

    await connectDB();
    const existing = await Tournament.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const existingDoc = existing as unknown as { registeredTeams?: number; teamSize?: number };
    const existingCount = existingDoc.registeredTeams ?? 0;
    if (
      typeof validation.data.maxTeams === "number" &&
      validation.data.maxTeams < existingCount
    ) {
      return NextResponse.json(
        {
          error: `maxTeams cannot be less than current registered teams (${existingCount})`,
        },
        { status: 400 }
      );
    }
    if (
      typeof validation.data.teamSize === "number" &&
      existingCount > 0 &&
      validation.data.teamSize !== existingDoc.teamSize
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot change team size when teams are already registered. Team size can only be changed when there are no registrations.",
        },
        { status: 400 }
      );
    }

    const updated = await Tournament.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/admin/tournaments/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const id = typeof params?.id === "string" ? params.id : undefined;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid tournament ID" }, { status: 400 });
    }

    await connectDB();
    const existing = await Tournament.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (existing.registeredTeams !== 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${existing.registeredTeams} team(s) registered. Remove teams first.`,
        },
        { status: 400 }
      );
    }

    await Tournament.findByIdAndDelete(id);
    return NextResponse.json(
      { success: true, message: "Tournament deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/admin/tournaments/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete tournament" },
      { status: 500 }
    );
  }
}

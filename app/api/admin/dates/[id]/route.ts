import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import TournamentDate from "@/models/TournamentDate";

type PatchBody = {
  maxTeams?: number;
  isClosed?: boolean;
};

function validatePatchBody(body: unknown): { ok: true; data: PatchBody } | { ok: false; status: number; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Request body must be a JSON object" };
  }

  const { maxTeams, isClosed } = body as PatchBody;
  const updates: PatchBody = {};

  if (maxTeams !== undefined) {
    if (typeof maxTeams !== "number" || Number.isNaN(maxTeams) || maxTeams < 1) {
      return { ok: false, status: 400, message: "maxTeams must be a positive number" };
    }
    updates.maxTeams = maxTeams;
  }

  if (isClosed !== undefined) {
    if (typeof isClosed !== "boolean") {
      return { ok: false, status: 400, message: "isClosed must be a boolean" };
    }
    updates.isClosed = isClosed;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, status: 400, message: "Provide at least one of: maxTeams, isClosed" };
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
      return NextResponse.json(
        { error: "Invalid tournament date ID" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const validation = validatePatchBody(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message },
        { status: validation.status }
      );
    }

    await connectDB();

    const existing = await TournamentDate.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Tournament date not found" },
        { status: 404 }
      );
    }

    if (validation.data.maxTeams !== undefined && validation.data.maxTeams < existing.registeredTeams) {
      return NextResponse.json(
        {
          error: `maxTeams cannot be less than current registered teams (${existing.registeredTeams})`,
        },
        { status: 400 }
      );
    }

    const updated = await TournamentDate.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/admin/dates/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update tournament date" },
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
      return NextResponse.json(
        { error: "Invalid tournament date ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await TournamentDate.findById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Tournament date not found" },
        { status: 404 }
      );
    }

    if (existing.registeredTeams !== 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${existing.registeredTeams} team(s) registered. Delete or move teams first.`,
        },
        { status: 400 }
      );
    }

    await TournamentDate.findByIdAndDelete(id);

    return NextResponse.json(
      { success: true, message: "Tournament date deleted" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/admin/dates/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete tournament date" },
      { status: 500 }
    );
  }
}

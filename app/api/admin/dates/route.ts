import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import TournamentDate from "@/models/TournamentDate";
import { authOptions } from "@/lib/auth";
import { isAdminOrSuperAdmin } from "@/lib/adminAuth";

type CreateBody = {
  date?: string;
  maxTeams?: number;
};

function validateCreateBody(body: unknown): { ok: true; data: { date: string; maxTeams: number } } | { ok: false; status: number; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Request body must be a JSON object" };
  }

  const { date, maxTeams } = body as CreateBody;

  if (typeof date !== "string" || !date.trim()) {
    return { ok: false, status: 400, message: "date is required and must be a non-empty string" };
  }

  if (typeof maxTeams !== "number" || Number.isNaN(maxTeams) || maxTeams < 1) {
    return { ok: false, status: 400, message: "maxTeams is required and must be a positive number" };
  }

  return { ok: true, data: { date: date.trim(), maxTeams } };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOrSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();

    const dates = await TournamentDate.find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(dates, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/dates error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tournament dates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminOrSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const validation = validateCreateBody(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message },
        { status: validation.status }
      );
    }

    const { date, maxTeams } = validation.data;

    await connectDB();

    const existing = await TournamentDate.findOne({ date });
    if (existing) {
      return NextResponse.json(
        { error: "A tournament date with this date already exists" },
        { status: 409 }
      );
    }

    const doc = await TournamentDate.create({
      date,
      maxTeams,
      registeredTeams: 0,
      isClosed: false,
    });

    const created = doc.toObject();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/dates error:", err);
    return NextResponse.json(
      { error: "Failed to create tournament date" },
      { status: 500 }
    );
  }
}

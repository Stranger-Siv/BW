import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tournament, {
  type TournamentStatus,
  type TournamentType,
  TOURNAMENT_TYPE_TEAM_SIZE,
} from "@/models/Tournament";

const STATUS_VALUES: TournamentStatus[] = [
  "draft",
  "registration_open",
  "registration_closed",
  "ongoing",
  "completed",
];

const TYPE_VALUES: TournamentType[] = ["solo", "duo", "squad"];

type CreateBody = {
  name?: string;
  type?: string;
  date?: string;
  startTime?: string;
  registrationDeadline?: string;
  maxTeams?: number;
  teamSize?: number;
  status?: string;
  description?: string;
  prize?: string;
  serverIP?: string;
};

function validateCreateBody(
  body: unknown
): { ok: true; data: Record<string, unknown> } | { ok: false; status: number; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Request body must be a JSON object" };
  }

  const b = body as CreateBody;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const typeVal =
    typeof b.type === "string" && TYPE_VALUES.includes(b.type as TournamentType)
      ? (b.type as TournamentType)
      : "squad";
  const date = typeof b.date === "string" ? b.date.trim() : "";
  const startTime = typeof b.startTime === "string" ? b.startTime.trim() : "";
  const registrationDeadline =
    typeof b.registrationDeadline === "string" ? b.registrationDeadline.trim() : "";
  const maxTeams = typeof b.maxTeams === "number" ? b.maxTeams : NaN;
  const teamSizeFromType = TOURNAMENT_TYPE_TEAM_SIZE[typeVal];
  const teamSize =
    typeof b.teamSize === "number" && Number.isFinite(b.teamSize) && b.teamSize >= 1
      ? b.teamSize
      : teamSizeFromType;

  if (!name) return { ok: false, status: 400, message: "name is required" };
  if (!date) return { ok: false, status: 400, message: "date is required" };
  if (!startTime) return { ok: false, status: 400, message: "startTime is required" };
  if (!registrationDeadline)
    return { ok: false, status: 400, message: "registrationDeadline is required" };
  if (!Number.isFinite(maxTeams) || maxTeams < 1)
    return { ok: false, status: 400, message: "maxTeams must be a positive number" };
  if (![1, 2, 4].includes(teamSize))
    return { ok: false, status: 400, message: "teamSize must be 1 (solo), 2 (duo), or 4 (squad)" };

  const status =
    typeof b.status === "string" && STATUS_VALUES.includes(b.status as TournamentStatus)
      ? (b.status as TournamentStatus)
      : "draft";

  const data: Record<string, unknown> = {
    name,
    type: typeVal,
    date,
    startTime,
    registrationDeadline,
    maxTeams,
    teamSize,
    status,
    registeredTeams: 0,
    isClosed: false,
  };
  const desc = typeof b.description === "string" ? b.description.trim() : "";
  const prize = typeof b.prize === "string" ? b.prize.trim() : "";
  const serverIP = typeof b.serverIP === "string" ? b.serverIP.trim() : "";
  if (desc) data.description = desc;
  if (prize) data.prize = prize;
  if (serverIP) data.serverIP = serverIP;

  return { ok: true, data };
}

export async function GET() {
  try {
    await connectDB();
    const list = await Tournament.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("GET /api/admin/tournaments error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateCreateBody(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message },
        { status: validation.status }
      );
    }

    await connectDB();
    const doc = await Tournament.create(validation.data);
    return NextResponse.json(doc.toObject(), { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/tournaments error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create tournament";
    const safeToShow =
      err instanceof Error &&
      (err.name === "ValidationError" ||
        message.includes("MONGO_URI") ||
        process.env.NODE_ENV !== "production");
    return NextResponse.json(
      { error: safeToShow ? message : "Failed to create tournament" },
      { status: 500 }
    );
  }
}

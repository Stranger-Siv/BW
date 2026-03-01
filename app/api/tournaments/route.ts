import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

/** Prevent caching so draft→registration_open updates show immediately */
export const dynamic = "force-dynamic";

/**
 * Public list of tournaments: open for registration, scheduled, and closed (so users can view details).
 * - scheduled: registration opens later.
 * - registration_open: has slots.
 * - registration_closed, ongoing, completed: view-only (closed).
 */
export async function GET() {
  try {
    await connectDB();
    const now = new Date();
    await Tournament.updateMany(
      { status: "scheduled", scheduledAt: { $lte: now } },
      { $set: { status: "registration_open" } }
    );
    const list = await Tournament.find({
      status: { $in: ["scheduled", "registration_open", "registration_closed", "ongoing", "completed"] },
    })
      .sort({ date: 1, startTime: 1 })
      .select("name type date startTime registrationDeadline maxTeams teamSize registeredTeams status scheduledAt description prize serverIP")
      .lean();
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("GET /api/tournaments error:", err);
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

/** Prevent caching so draft→registration_open updates show immediately */
export const dynamic = "force-dynamic";

/**
 * Public list of tournaments: open for registration and scheduled (registration opens later).
 * - registration_open: not full, not closed.
 * - scheduled: show "Registration opens at [scheduledAt]".
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
      isClosed: false,
      $or: [
        { status: "scheduled" },
        {
          status: "registration_open",
          $expr: { $lt: ["$registeredTeams", "$maxTeams"] },
        },
      ],
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

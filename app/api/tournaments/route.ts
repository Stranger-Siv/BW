import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tournament from "@/models/Tournament";

/**
 * Public list of tournaments open for registration.
 * Returns tournaments with status "registration_open" that are not full.
 */
export async function GET() {
  try {
    await connectDB();
    const list = await Tournament.find({
      status: "registration_open",
      isClosed: false,
      $expr: { $lt: ["$registeredTeams", "$maxTeams"] },
    })
      .sort({ date: 1, startTime: 1 })
      .select("name type date startTime registrationDeadline maxTeams teamSize registeredTeams")
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

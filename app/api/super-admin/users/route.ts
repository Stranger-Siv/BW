import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Team from "@/models/Team";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const users = await User.find()
      .select("email name displayName minecraftIGN discordUsername discordId role banned createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // User IDs that have at least one team with status "pending" (as captain or player)
    const pendingTeams = await Team.find({ status: "pending" })
      .select("captainId players.userId")
      .lean();
    const userIdsWithPending = new Set<string>();
    for (const t of pendingTeams as unknown as { captainId?: { toString(): string }; players?: { userId?: { toString(): string } }[] }[]) {
      if (t.captainId) userIdsWithPending.add(t.captainId.toString());
      for (const p of t.players ?? []) {
        if (p.userId) userIdsWithPending.add(p.userId.toString());
      }
    }

    const list = (users as unknown as Record<string, unknown>[]).map((u) => {
      const id = (u._id as { toString(): string }).toString();
      return {
        _id: id,
        email: u.email,
        name: u.name,
        displayName: u.displayName,
        minecraftIGN: u.minecraftIGN,
        discordUsername: u.discordUsername,
        discordConnected: !!(u.discordId as string | undefined),
        pendingTeams: userIdsWithPending.has(id),
        role: u.role,
        banned: u.banned === true,
        createdAt: u.createdAt,
      };
    });
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("GET /api/super-admin/users error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * POST: Disconnect Discord for all users (super_admin only).
 * Unsets discordId and discordUsername so everyone can reconnect from Profile.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    const result = await User.updateMany(
      { discordId: { $exists: true, $nin: [null, ""] } },
      { $unset: { discordId: 1, discordUsername: 1 } }
    );
    const disconnected = result.modifiedCount;
    return NextResponse.json({ disconnected }, { status: 200 });
  } catch (err) {
    console.error("POST /api/super-admin/users/disconnect-discord error:", err);
    return NextResponse.json({ error: "Failed to disconnect Discord" }, { status: 500 });
  }
}

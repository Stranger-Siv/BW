import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
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
      .select("email name displayName minecraftIGN discordUsername role banned createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const list = (users as unknown as Record<string, unknown>[]).map((u) => ({
      _id: (u._id as { toString(): string }).toString(),
      email: u.email,
      name: u.name,
      displayName: u.displayName,
      minecraftIGN: u.minecraftIGN,
      discordUsername: u.discordUsername,
      role: u.role,
      banned: u.banned === true,
      createdAt: u.createdAt,
    }));
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("GET /api/super-admin/users error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

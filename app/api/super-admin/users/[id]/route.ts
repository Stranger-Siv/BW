import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";

const ROLES = ["player", "admin", "super_admin"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const currentUserId = (session?.user as { id?: string })?.id;
    if (id === currentUserId) {
      return NextResponse.json(
        { error: "You cannot change your own role or ban yourself" },
        { status: 400 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const role = typeof body.role === "string" && ROLES.includes(body.role as (typeof ROLES)[number])
      ? (body.role as (typeof ROLES)[number])
      : undefined;
    const banned = typeof body.banned === "boolean" ? body.banned : undefined;

    if (role === undefined && banned === undefined) {
      return NextResponse.json(
        { error: "Provide at least one of: role, banned" },
        { status: 400 }
      );
    }

    await connectDB();
    const target = await User.findById(id);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: { role?: string; banned?: boolean } = {};
    if (role !== undefined) updates.role = role;
    if (banned !== undefined) updates.banned = banned;

    await User.findByIdAndUpdate(id, { $set: updates });
    const updated = await User.findById(id)
      .select("email name displayName minecraftIGN discordUsername role banned createdAt")
      .lean();
    const u = updated as unknown as Record<string, unknown>;
    return NextResponse.json(
      {
        ...u,
        _id: (u._id as { toString(): string }).toString(),
        banned: u.banned === true,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/super-admin/users/[id] error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

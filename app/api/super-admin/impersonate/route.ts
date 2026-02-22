import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";
import { createAuditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/** Start impersonation: validate and log. Client must then call session.update({ impersonatingUserId: userId }). */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actorId = (session?.user as { id?: string })?.id;
    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    if (userId === actorId) {
      return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
    }
    await connectDB();
    const target = await User.findById(userId).select("email name displayName").lean();
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const t = target as unknown as { email?: string; name?: string; displayName?: string };
    await createAuditLog({
      actorId: actorId!,
      action: "impersonation_start",
      targetType: "user",
      targetId: userId,
      details: { targetEmail: t.email, targetName: t.displayName || t.name },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/super-admin/impersonate error:", err);
    return NextResponse.json({ error: "Failed to start impersonation" }, { status: 500 });
  }
}

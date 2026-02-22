import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10));

    await connectDB();
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const actorIds = Array.from(new Set((logs as unknown as { actorId: string }[]).map((l) => l.actorId)));
    const validIds = actorIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const users = await User.find({ _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) } })
      .select("email name displayName")
      .lean();
    const userMap = new Map(
      (users as { _id: { toString(): string }; email?: string; name?: string; displayName?: string }[]).map((u) => [
        u._id.toString(),
        u.displayName || u.name || u.email || "Unknown",
      ])
    );

    const list = (logs as unknown as Record<string, unknown>[]).map((log) => ({
      _id: (log._id as { toString(): string }).toString(),
      actorId: log.actorId,
      actorName: userMap.get(log.actorId as string) ?? (log.actorId as string),
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details,
      createdAt: log.createdAt,
    }));

    const total = await AuditLog.countDocuments();
    return NextResponse.json({ logs: list, total }, { status: 200 });
  } catch (err) {
    console.error("GET /api/super-admin/audit error:", err);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}

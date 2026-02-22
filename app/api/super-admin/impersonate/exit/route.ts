import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";
import { createAuditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

/** Log impersonation end. Call after client has called session.update({ impersonatingUserId: null }). */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actorId = (session?.user as { id?: string })?.id;
    const body = await request.json().catch(() => ({}));
    const impersonatedUserId = typeof body.impersonatedUserId === "string" ? body.impersonatedUserId.trim() : "";
    if (impersonatedUserId && mongoose.Types.ObjectId.isValid(impersonatedUserId)) {
      await createAuditLog({
        actorId: actorId!,
        action: "impersonation_end",
        targetType: "user",
        targetId: impersonatedUserId,
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/super-admin/impersonate/exit error:", err);
    return NextResponse.json({ error: "Failed to log exit" }, { status: 500 });
  }
}

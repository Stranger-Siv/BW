import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import SiteSettings, { SITE_SETTINGS_ID } from "@/models/SiteSettings";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";
import { createAuditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actorId = (session?.user as { id?: string })?.id;
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const active = typeof body.active === "boolean" ? body.active : undefined;

    await connectDB();
    let doc = await SiteSettings.findById(SITE_SETTINGS_ID);
    if (!doc) {
      doc = await SiteSettings.create({
        _id: SITE_SETTINGS_ID,
        maintenanceMode: false,
        announcement: { message: "", active: false, updatedAt: new Date() },
        updatedAt: new Date(),
      });
    }

    const prevActive = doc.announcement?.active ?? false;
    const prevMessage = (doc.announcement?.message ?? "") as string;

    const newMessage = message !== undefined ? message : (doc.announcement?.message ?? "");
    const newActive = active !== undefined ? active : (doc.announcement?.active ?? false);
    const now = new Date();
    doc.set("announcement", {
      message: newMessage,
      active: newActive,
      updatedAt: now,
      updatedBy: actorId,
    });
    doc.set("updatedAt", now);
    await doc.save();

    if (newActive && (newMessage !== prevMessage || !prevActive)) {
      await createAuditLog({
        actorId: actorId!,
        action: "announcement_set",
        targetType: "announcement",
        details: { message: newMessage },
      });
    }
    if (!newActive && prevActive) {
      await createAuditLog({
        actorId: actorId!,
        action: "announcement_clear",
        targetType: "announcement",
      });
    }

    return NextResponse.json(
      {
        message: newMessage,
        active: newActive,
        updatedAt: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/super-admin/announcement error:", err);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import SiteSettings, { SITE_SETTINGS_ID } from "@/models/SiteSettings";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/adminAuth";
import { createAuditLog } from "@/lib/auditLog";
import { getServerPusher, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await connectDB();
    let doc = await SiteSettings.findById(SITE_SETTINGS_ID).lean();
    if (!doc) {
      await SiteSettings.create({
        _id: SITE_SETTINGS_ID,
        maintenanceMode: false,
        announcement: { message: "", active: false, updatedAt: new Date() },
        updatedAt: new Date(),
      });
      doc = await SiteSettings.findById(SITE_SETTINGS_ID).lean();
    }
    const d = doc as unknown as { maintenanceMode?: boolean; announcement?: { message?: string; active?: boolean }; updatedAt?: string };
    return NextResponse.json(
      {
        maintenanceMode: d.maintenanceMode ?? false,
        announcement: d.announcement ?? { message: "", active: false, updatedAt: new Date().toISOString() },
        updatedAt: d.updatedAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /api/super-admin/settings error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actorId = (session?.user as { id?: string })?.id;
    const body = await request.json().catch(() => ({}));
    const maintenanceMode = typeof body.maintenanceMode === "boolean" ? body.maintenanceMode : undefined;

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

    if (maintenanceMode !== undefined) {
      doc.maintenanceMode = maintenanceMode;
      doc.updatedAt = new Date();
      await doc.save();
      await createAuditLog({
        actorId: actorId!,
        action: "setting_change",
        targetType: "settings",
        details: { maintenanceMode },
      });
    }

    const updated = await SiteSettings.findById(SITE_SETTINGS_ID).lean();
    const u = updated as unknown as { maintenanceMode?: boolean; announcement?: { message?: string; active?: boolean }; updatedAt?: string };
    const pusher = getServerPusher();
    if (maintenanceMode !== undefined && pusher) {
      pusher.trigger(PUSHER_CHANNELS.SITE, PUSHER_EVENTS.MAINTENANCE_CHANGED, {
        maintenanceMode: u?.maintenanceMode ?? false,
      });
    }
    return NextResponse.json(
      {
        maintenanceMode: u.maintenanceMode ?? false,
        announcement: u.announcement ?? { message: "", active: false, updatedAt: new Date().toISOString() },
        updatedAt: u.updatedAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/super-admin/settings error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

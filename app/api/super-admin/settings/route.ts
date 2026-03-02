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
        hostedByName: "BABA TILLU",
        hostedByNames: ["BABA TILLU"],
        announcement: { message: "", active: false, updatedAt: new Date() },
        updatedAt: new Date(),
      });
      doc = await SiteSettings.findById(SITE_SETTINGS_ID).lean();
    }
    const d = doc as unknown as {
      maintenanceMode?: boolean;
      hostedByName?: string;
      hostedByNames?: string[];
      announcement?: { message?: string; active?: boolean };
      updatedAt?: string;
    };
    return NextResponse.json(
      {
        maintenanceMode: d.maintenanceMode ?? false,
        hostedByName: d.hostedByName ?? "BABA TILLU",
        hostedByNames:
          (Array.isArray(d.hostedByNames) ? d.hostedByNames : [d.hostedByName ?? "BABA TILLU"])
            .map((s) => (s ?? "").toString().trim())
            .filter(Boolean),
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
    const maintenanceMode =
      typeof body.maintenanceMode === "boolean" ? body.maintenanceMode : undefined;
    const hostedByName =
      typeof body.hostedByName === "string" ? body.hostedByName.trim() : undefined;
    const hostedByNames =
      Array.isArray(body.hostedByNames) && body.hostedByNames.length > 0
        ? body.hostedByNames
            .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
            .filter((s: string) => !!s)
        : undefined;

    await connectDB();
    let doc = await SiteSettings.findById(SITE_SETTINGS_ID);
    if (!doc) {
      doc = await SiteSettings.create({
        _id: SITE_SETTINGS_ID,
        maintenanceMode: false,
        hostedByName: hostedByName ?? "BABA TILLU",
        hostedByNames: hostedByNames ?? [hostedByName ?? "BABA TILLU"],
        announcement: { message: "", active: false, updatedAt: new Date() },
        updatedAt: new Date(),
      });
    }

    let changed = false;
    if (maintenanceMode !== undefined) {
      doc.maintenanceMode = maintenanceMode;
      changed = true;
      await createAuditLog({
        actorId: actorId!,
        action: "setting_change",
        targetType: "settings",
        details: { maintenanceMode },
      });
    }
    if (hostedByName !== undefined) {
      doc.hostedByName = hostedByName;
      changed = true;
      await createAuditLog({
        actorId: actorId!,
        action: "setting_change",
        targetType: "settings",
        details: { hostedByName },
      });
    }
    if (hostedByNames !== undefined) {
      doc.hostedByNames = hostedByNames;
      if (!doc.hostedByName && hostedByNames.length > 0) {
        doc.hostedByName = hostedByNames[0];
      }
      changed = true;
      await createAuditLog({
        actorId: actorId!,
        action: "setting_change",
        targetType: "settings",
        details: { hostedByNames },
      });
    }
    if (changed) {
      doc.updatedAt = new Date();
      await doc.save();
    }

    const updated = await SiteSettings.findById(SITE_SETTINGS_ID).lean();
    const u = updated as unknown as {
      maintenanceMode?: boolean;
      hostedByName?: string;
      hostedByNames?: string[];
      announcement?: { message?: string; active?: boolean };
      updatedAt?: string;
    };
    if (maintenanceMode !== undefined) {
      const pusher = getServerPusher();
      const payload = { maintenanceMode: u?.maintenanceMode ?? false };
      if (pusher) {
        if (process.env.NODE_ENV === "development") {
          console.log("[Pusher] Triggering maintenance_changed", payload);
        }
        pusher.trigger(PUSHER_CHANNELS.SITE, PUSHER_EVENTS.MAINTENANCE_CHANGED, payload);
      } else if (process.env.NODE_ENV === "development") {
        console.log("[Pusher] Not configured: set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER in .env.local");
      }
    }
    return NextResponse.json(
      {
        maintenanceMode: u.maintenanceMode ?? false,
        hostedByName: u.hostedByName ?? "BABA TILLU",
        hostedByNames:
          (Array.isArray(u.hostedByNames) ? u.hostedByNames : [u.hostedByName ?? "BABA TILLU"])
            .map((s) => (s ?? "").toString().trim())
            .filter(Boolean),
        announcement:
          u.announcement ?? { message: "", active: false, updatedAt: new Date().toISOString() },
        updatedAt: u.updatedAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("PATCH /api/super-admin/settings error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

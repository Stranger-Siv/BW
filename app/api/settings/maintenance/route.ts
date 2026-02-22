import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SiteSettings, { SITE_SETTINGS_ID } from "@/models/SiteSettings";

export const dynamic = "force-dynamic";

/** Public: whether maintenance mode is on (so layout can show maintenance page for non–super admins). */
export async function GET() {
  try {
    await connectDB();
    const doc = await SiteSettings.findById(SITE_SETTINGS_ID).select("maintenanceMode").lean();
    const d = doc as unknown as { maintenanceMode?: boolean } | null;
    return NextResponse.json({ maintenanceMode: d?.maintenanceMode === true });
  } catch {
    return NextResponse.json({ maintenanceMode: false });
  }
}

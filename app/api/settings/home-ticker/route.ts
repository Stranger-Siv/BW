import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SiteSettings, { SITE_SETTINGS_ID } from "@/models/SiteSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const doc = await SiteSettings.findById(SITE_SETTINGS_ID)
      .select("homeTickerEnabled homeTickerItems")
      .lean();
    const d = doc as unknown as {
      homeTickerEnabled?: boolean;
      homeTickerItems?: string[];
    } | null;
    const enabled = !!d?.homeTickerEnabled;
    const items = Array.isArray(d?.homeTickerItems)
      ? d!.homeTickerItems.map((s) => (s ?? "").toString().trim()).filter(Boolean)
      : [];
    return NextResponse.json(
      { enabled, items },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.error("GET /api/settings/home-ticker error:", err);
    return NextResponse.json(
      { enabled: false, items: [] as string[] },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}


import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SiteSettings, { SITE_SETTINGS_ID } from "@/models/SiteSettings";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const doc = await SiteSettings.findById(SITE_SETTINGS_ID).select("hostedByName").lean();
    const d = doc as unknown as { hostedByName?: string } | null;
    const hostedByName = (d?.hostedByName || SITE.hostedBy || "Host").toString();
    return NextResponse.json(
      { hostedByName },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.error("GET /api/settings/site error:", err);
    return NextResponse.json(
      { hostedByName: SITE.hostedBy || "Host" },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}


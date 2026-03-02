import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SiteSettings, { SITE_SETTINGS_ID } from "@/models/SiteSettings";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const doc = await SiteSettings.findById(SITE_SETTINGS_ID)
      .select("hostedByNames hostedByName")
      .lean();
    const d = doc as unknown as { hostedByNames?: string[]; hostedByName?: string } | null;
    const names =
      (Array.isArray(d?.hostedByNames) ? d!.hostedByNames : [d?.hostedByName ?? SITE.hostedBy])
        .map((s) => (s ?? "").toString().trim())
        .filter(Boolean);
    const hostedByNames = names.length ? names : [SITE.hostedBy];
    return NextResponse.json(
      { hostedByNames },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.error("GET /api/settings/site error:", err);
    return NextResponse.json(
      { hostedByNames: [SITE.hostedBy] },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}


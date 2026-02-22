import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SiteSettings, { SITE_SETTINGS_ID } from "@/models/SiteSettings";

export const dynamic = "force-dynamic";

/** Public: get active announcement for the banner. */
export async function GET() {
  try {
    await connectDB();
    const doc = await SiteSettings.findById(SITE_SETTINGS_ID).select("announcement").lean();
    const d = doc as unknown as { announcement?: { message?: string; active?: boolean } } | null;
    const ann = d?.announcement;
    if (!ann?.active || !ann?.message?.trim()) {
      return NextResponse.json({ message: "", active: false });
    }
    return NextResponse.json({ message: ann.message.trim(), active: true });
  } catch {
    return NextResponse.json({ message: "", active: false });
  }
}

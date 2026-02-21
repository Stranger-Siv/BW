import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    const user = await User.findById(session.user.id)
      .select("email name image displayName minecraftIGN discordUsername role createdAt")
      .lean();
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const u = user as unknown as { displayName?: string | null; [k: string]: unknown };
    return Response.json(
      { ...u, displayName: u.displayName ?? null },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.error("GET /api/users/me error:", err);
    return Response.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : undefined;
    const minecraftIGN = typeof body.minecraftIGN === "string" ? body.minecraftIGN.trim() : undefined;
    const discordUsername = typeof body.discordUsername === "string" ? body.discordUsername.trim() : undefined;
    await connectDB();
    const updates: { displayName?: string; minecraftIGN?: string; discordUsername?: string } = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (minecraftIGN !== undefined) updates.minecraftIGN = minecraftIGN;
    if (discordUsername !== undefined) updates.discordUsername = discordUsername;
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updates },
      { new: true }
    )
      .select("email name image displayName minecraftIGN discordUsername role createdAt")
      .lean();
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    const payload = user as unknown as { displayName?: string; [k: string]: unknown };
    return Response.json(
      { ...payload, displayName: payload.displayName ?? null },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err) {
    console.error("PATCH /api/users/me error:", err);
    return Response.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

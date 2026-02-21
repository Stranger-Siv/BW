import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json([]);
  }
  try {
    await connectDB();
    const search = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const list = await User.find({
      _id: { $ne: session.user.id },
      $or: [
        { name: search },
        { displayName: search },
        { email: search },
        { minecraftIGN: search },
        { discordUsername: search },
      ],
    })
      .select("_id name image displayName email minecraftIGN discordUsername")
      .limit(20)
      .lean();
    return Response.json(
      list.map((u: unknown) => {
        const x = u as { _id: { toString(): string }; name: string; displayName?: string; image?: string; email: string; minecraftIGN?: string; discordUsername?: string };
        return {
          id: x._id.toString(),
          name: x.displayName || x.name,
          image: x.image ?? null,
          email: x.email,
          minecraftIGN: x.minecraftIGN ?? "",
          discordUsername: x.discordUsername ?? "",
        };
      })
    );
  } catch (err) {
    console.error("GET /api/users/search error:", err);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}

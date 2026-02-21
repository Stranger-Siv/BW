import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Round from "@/models/Round";
import { authOptions } from "@/lib/auth";

function isAdmin(session: { user?: { role?: string } } | null): boolean {
  return session?.user?.role === "admin";
}

/**
 * DELETE /api/admin/tournaments/[id]/rounds/[roundId]
 * Delete a round. Only if the round belongs to this tournament.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id?: string; roundId?: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: tournamentId, roundId } = await params;
  if (!tournamentId || !mongoose.Types.ObjectId.isValid(tournamentId)) {
    return Response.json({ error: "Invalid tournament ID" }, { status: 400 });
  }
  if (!roundId || !mongoose.Types.ObjectId.isValid(roundId)) {
    return Response.json({ error: "Invalid round ID" }, { status: 400 });
  }
  try {
    await connectDB();
    const deleted = await Round.findOneAndDelete({
      _id: roundId,
      tournamentId: new mongoose.Types.ObjectId(tournamentId),
    });
    if (!deleted) {
      return Response.json({ error: "Round not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE round error:", err);
    return Response.json({ error: "Failed to delete round" }, { status: 500 });
  }
}

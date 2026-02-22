import connectDB from "@/lib/mongodb";
import AuditLog, { type AuditAction } from "@/models/AuditLog";

export type TargetType = "user" | "settings" | "announcement";

export async function createAuditLog(params: {
  actorId: string;
  action: AuditAction;
  targetType: TargetType;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details ?? undefined,
    });
  } catch (err) {
    console.error("createAuditLog error:", err);
  }
}

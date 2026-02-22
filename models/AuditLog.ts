import mongoose, { Schema, model, models } from "mongoose";

export type AuditAction =
  | "role_change"
  | "ban"
  | "unban"
  | "impersonation_start"
  | "impersonation_end"
  | "setting_change"
  | "announcement_set"
  | "announcement_clear";

export interface IAuditLog {
  actorId: string;
  action: AuditAction;
  targetType: "user" | "settings" | "announcement";
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true },
    action: { type: String, required: true, enum: ["role_change", "ban", "unban", "impersonation_start", "impersonation_end", "setting_change", "announcement_set", "announcement_clear"] },
    targetType: { type: String, required: true, enum: ["user", "settings", "announcement"] },
    targetId: { type: String },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

const AuditLog = models.AuditLog ?? model<IAuditLog>("AuditLog", auditLogSchema);
export default AuditLog;

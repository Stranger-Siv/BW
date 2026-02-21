import mongoose, { Schema, model, models } from "mongoose";

export type TeamInviteStatus = "pending" | "accepted" | "rejected";

export interface ITeamInvite {
  captainId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  tournamentId: mongoose.Types.ObjectId;
  teamName: string;
  status: TeamInviteStatus;
  createdAt: Date;
}

const teamInviteSchema = new Schema<ITeamInvite>(
  {
    captainId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    teamName: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

teamInviteSchema.index({ toUserId: 1, status: 1 });
teamInviteSchema.index({ captainId: 1, tournamentId: 1, teamName: 1 });
teamInviteSchema.index({ captainId: 1, tournamentId: 1, teamName: 1, toUserId: 1 }, { unique: true });

const TeamInvite = models.TeamInvite ?? model<ITeamInvite>("TeamInvite", teamInviteSchema);

export default TeamInvite;

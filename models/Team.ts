import mongoose, { Schema, model, models } from "mongoose";

export interface IPlayer {
  userId?: mongoose.Types.ObjectId;
  minecraftIGN: string;
  discordUsername: string;
}


export type TeamStatus = "pending" | "approved" | "rejected";

export interface ITeam {
  teamName: string;
  tournamentDate?: string;
  tournamentId?: mongoose.Types.ObjectId;
  captainId?: mongoose.Types.ObjectId;
  players: IPlayer[];
  rewardReceiverIGN: string;
  status: TeamStatus;
  createdAt: Date;
}

const playerSchema = new Schema<IPlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    minecraftIGN: { type: String, required: true },
    discordUsername: { type: String, required: true },
  },
  { _id: false }
);

const teamSchema = new Schema<ITeam>(
  {
    teamName: { type: String, required: true },
    tournamentDate: { type: String },
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament" },
    captainId: { type: Schema.Types.ObjectId, ref: "User" },
    players: {
      type: [playerSchema],
      required: true,
      validate: {
        validator: (v: IPlayer[]) =>
          v.length >= 1 && v.length <= 4,
        message: "Players must be 1–4 (solo/duo/squad; 3 allowed when replacing)",
      },
    },
    rewardReceiverIGN: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

teamSchema.pre("validate", function (next) {
  const hasDate = this.tournamentDate != null && String(this.tournamentDate).trim() !== "";
  const hasId = this.tournamentId != null;
  if (!hasDate && !hasId) {
    next(new Error("Either tournamentDate or tournamentId is required"));
    return;
  }
  const igns = this.players?.map((p) => p.minecraftIGN) ?? [];
  if (igns.length && !igns.includes(this.rewardReceiverIGN)) {
    next(new Error("rewardReceiverIGN must be one of the players' Minecraft IGN"));
    return;
  }
  next();
});

teamSchema.index({ teamName: 1, tournamentDate: 1 }, { unique: true, sparse: true });
teamSchema.index({ teamName: 1, tournamentId: 1 }, { unique: true, sparse: true });
teamSchema.index({ tournamentDate: 1 });
teamSchema.index({ tournamentId: 1 });
teamSchema.index({ captainId: 1 });
teamSchema.index({ "players.userId": 1 });

const Team = models.Team ?? model<ITeam>("Team", teamSchema);

export default Team;

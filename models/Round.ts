import mongoose, { Schema, model, models } from "mongoose";

export interface IRound {
  tournamentId: mongoose.Types.ObjectId;
  roundNumber: number;
  name: string;
  scheduledAt?: Date;
  teamIds: mongoose.Types.ObjectId[];
  /** True if this round is the final (winner round); used for champion display and 🏆 in admin */
  isWinnerRound?: boolean;
  /** Number of team slots in this round: 2 = 4v4 (one match), 4 = 4v4v4v4 (default) */
  slotCount?: number;
  /** Optional label shown to players, e.g. "Final", "Semi-final", "Quarter-final", "Knockout" */
  stageLabel?: string;
  /** Optional public details shown to players under the round */
  publicDetails?: string;
  createdAt: Date;
}

const roundSchema = new Schema<IRound>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    roundNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    scheduledAt: { type: Date },
    teamIds: [{ type: Schema.Types.ObjectId, ref: "Team", default: [] }],
    isWinnerRound: { type: Boolean, default: false },
    slotCount: { type: Number, default: 4 },
    stageLabel: { type: String, trim: true },
    publicDetails: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

roundSchema.index({ tournamentId: 1, roundNumber: 1 }, { unique: true });

const Round = models.Round ?? model<IRound>("Round", roundSchema);

export default Round;

import mongoose, { Schema, model, models } from "mongoose";

export interface IRound {
  tournamentId: mongoose.Types.ObjectId;
  roundNumber: number;
  name: string;
  scheduledAt?: Date;
  teamIds: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const roundSchema = new Schema<IRound>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    roundNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    scheduledAt: { type: Date },
    teamIds: [{ type: Schema.Types.ObjectId, ref: "Team", default: [] }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

roundSchema.index({ tournamentId: 1, roundNumber: 1 }, { unique: true });

const Round = models.Round ?? model<IRound>("Round", roundSchema);

export default Round;

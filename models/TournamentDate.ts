import mongoose, { Schema, model, models } from "mongoose";

export interface ITournamentDate {
  date: string;
  maxTeams: number;
  registeredTeams: number;
  isClosed: boolean;
  createdAt: Date;
}

const tournamentDateSchema = new Schema<ITournamentDate>(
  {
    date: { type: String, required: true },
    maxTeams: { type: Number, required: true },
    registeredTeams: { type: Number, default: 0 },
    isClosed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Unique date for lookups; index for filtering
tournamentDateSchema.index({ date: 1 }, { unique: true });

const TournamentDate =
  models.TournamentDate ??
  model<ITournamentDate>("TournamentDate", tournamentDateSchema);

export default TournamentDate;

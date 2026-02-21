import mongoose, { Schema, model, models } from "mongoose";

export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "ongoing"
  | "completed";

export type TournamentType = "solo" | "duo" | "squad";

export const TOURNAMENT_TYPE_TEAM_SIZE: Record<TournamentType, number> = {
  solo: 1,
  duo: 2,
  squad: 4,
};

export interface ITournament {
  name: string;
  type: TournamentType;
  date: string;
  startTime: string;
  registrationDeadline: string;
  maxTeams: number;
  teamSize: number;
  registeredTeams: number;
  status: TournamentStatus;
  description?: string;
  prize?: string;
  serverIP?: string;
  isClosed: boolean;
  createdAt: Date;
}

const tournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["solo", "duo", "squad"],
      default: "squad",
    },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    registrationDeadline: { type: String, required: true },
    maxTeams: { type: Number, required: true },
    teamSize: { type: Number, required: true },
    registeredTeams: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ["draft", "registration_open", "registration_closed", "ongoing", "completed"],
      default: "draft",
    },
    description: { type: String },
    prize: { type: String },
    serverIP: { type: String },
    isClosed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

tournamentSchema.index({ date: 1 });
tournamentSchema.index({ status: 1 });

const Tournament =
  models.Tournament ?? model<ITournament>("Tournament", tournamentSchema);

export default Tournament;

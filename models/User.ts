import mongoose, { Schema, model, models } from "mongoose";

export type UserRole = "player" | "admin";

export interface IUser {
  googleId: string;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  /** Username for the platform (chosen by user, not from Google) */
  displayName?: string;
  minecraftIGN?: string;
  discordUsername?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, trim: true },
    role: {
      type: String,
      required: true,
      enum: ["player", "admin"],
      default: "player",
    },
    displayName: { type: String, trim: true },
    minecraftIGN: { type: String, trim: true },
    discordUsername: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

userSchema.index({ email: 1 });
userSchema.index({ name: 1, minecraftIGN: 1 });

const User = models.User ?? model<IUser>("User", userSchema);

export default User;

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, account, profile, trigger, session }) {
      // Handle session.update({ impersonatingUserId }) from super admin impersonation
      if (trigger === "update" && session && typeof session === "object") {
        const s = session as { impersonatingUserId?: string | null };
        if (s.impersonatingUserId !== undefined) {
          if (s.impersonatingUserId) {
            token.impersonatingUserId = s.impersonatingUserId;
            token.impersonatingFrom = token.sub ?? token.id;
          } else {
            delete token.impersonatingUserId;
            delete token.impersonatingFrom;
          }
        }
        return token;
      }
      if (account && profile) {
        await connectDB();

        // Google sign-in (create or fetch user).
        if (account.provider === "google" && "sub" in profile) {
          delete token.impersonatingUserId;
          delete token.impersonatingFrom;
          let dbUser = await User.findOne({ googleId: profile.sub as string }).lean();
          if (!dbUser) {
            const created = await User.create({
              googleId: profile.sub as string,
              email: (profile.email as string)?.trim().toLowerCase() ?? "",
              name: (profile.name as string)?.trim() ?? "User",
              image: ((profile as { picture?: string }).picture ?? (profile as { image?: string }).image) ?? undefined,
              role: "player",
            });
            dbUser = created.toObject();
          }
          const u = dbUser as unknown as { _id: { toString(): string }; role: string; banned?: boolean };
          token.id = u._id.toString();
          token.role = u.role;
          token.banned = u.banned === true;
        }

        // Discord sign-in or connect.
        if (account.provider === "discord" && "id" in profile) {
          const discordId = (profile as { id: string }).id;
          const discordEmailRaw = (profile as { email?: string }).email ?? "";
          const discordEmail = discordEmailRaw ? discordEmailRaw.trim().toLowerCase() : "";

          const baseName =
            (profile as { global_name?: string }).global_name ??
            (profile as { username?: string }).username ??
            "";
          const disc = (profile as { discriminator?: string }).discriminator;
          const tag =
            disc && disc !== "0" && baseName
              ? `${baseName}#${disc}`
              : baseName || (profile as { username?: string }).username || "";

          // If user is already logged in (token.id), treat as "connect".
          if (token.id) {
            const currentUserId = String(token.id);

            // Block if this Discord is already linked to ANY other user (not just "another" - double-check).
            const existingByDiscord = await User.findOne({ discordId }).select("_id").lean();
            const existingId = existingByDiscord
              ? (existingByDiscord as unknown as { _id: { toString(): string } })._id.toString()
              : null;
            if (existingId && existingId !== currentUserId) {
              throw new Error("This Discord account is already linked to another user. Sign in with that account or use a different Discord.");
            }

            const me = await User.findById(currentUserId).select("discordId").lean();
            const meUser = me as unknown as { discordId?: string } | null;
            if (!meUser) {
              throw new Error("Account not found. Please sign in again.");
            }
            if (meUser.discordId && meUser.discordId !== discordId) {
              throw new Error("Your account is already linked to a different Discord account.");
            }

            // Atomic: only set discordId on this user; ensure no other user has it (race safeguard).
            const updated = await User.findOneAndUpdate(
              { _id: currentUserId },
              { $set: { discordId, discordUsername: tag || undefined } },
              { new: true }
            )
              .select("_id role banned")
              .lean();

            const u = updated as unknown as { _id: { toString(): string }; role?: string; banned?: boolean } | null;
            if (u) {
              // Final check: ensure we didn't just create a duplicate (e.g. if unique index was missing).
              const dup = await User.findOne({ discordId, _id: { $ne: currentUserId } }).select("_id").lean();
              if (dup) {
                await User.findByIdAndUpdate(currentUserId, { $unset: { discordId: 1, discordUsername: 1 } });
                throw new Error("This Discord account is already linked to another user.");
              }
              token.id = u._id.toString();
              token.role = u.role ?? token.role;
              token.banned = u.banned === true;
            }
          } else {
            // Not logged in: allow Discord login by finding linked account or matching email.
            let dbUser =
              (await User.findOne({ discordId }).lean()) ??
              (discordEmail ? await User.findOne({ email: discordEmail }).lean() : null);

            if (!dbUser) {
              const created = await User.create({
                discordId,
                discordUsername: tag || undefined,
                email: discordEmail,
                name: baseName?.trim() || "User",
                image: ((profile as { image_url?: string }).image_url ?? (profile as { avatar?: string }).avatar) ?? undefined,
                role: "player",
              });
              dbUser = created.toObject();
            } else {
              const found = dbUser as unknown as { _id: { toString(): string }; email?: string; discordId?: string };
              const foundId = found._id.toString();
              const foundEmail = (found.email ?? "").trim().toLowerCase();
              if (foundEmail && foundEmail !== discordEmail) {
                throw new Error("This Discord account email does not match the existing account email.");
              }
              if (found.discordId && found.discordId !== discordId) {
                throw new Error("This email is already linked to a different Discord account.");
              }
              // If we found by email (not by discordId), ensure no OTHER user already has this discordId (race).
              const otherWithDiscord = await User.findOne({ discordId, _id: { $ne: foundId } }).select("_id").lean();
              if (otherWithDiscord) {
                throw new Error("This Discord account is already linked to another user.");
              }
              await User.findByIdAndUpdate(
                foundId,
                { $set: { discordId, discordUsername: tag || undefined } },
                { new: false }
              ).lean();
            }

            const u = dbUser as unknown as { _id: { toString(): string }; role: string; banned?: boolean };
            token.id = u._id.toString();
            token.role = u.role;
            token.banned = u.banned === true;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      await connectDB();
      if (token.impersonatingUserId && token.impersonatingFrom) {
        const impersonated = await User.findById(token.impersonatingUserId)
          .select("_id email name image role banned displayName")
          .lean();
        if (impersonated) {
          const u = impersonated as unknown as { _id: { toString(): string }; email?: string; name?: string; image?: string; role?: string; banned?: boolean; displayName?: string };
          (session.user as { id?: string }).id = u._id.toString();
          (session.user as { email?: string }).email = u.email;
          (session.user as { name?: string }).name = u.displayName || u.name;
          (session.user as { image?: string }).image = u.image;
          (session.user as { role?: string }).role = u.role;
          (session.user as { banned?: boolean }).banned = u.banned === true;
        }
        (session as { impersonatingFrom?: string }).impersonatingFrom = token.impersonatingFrom as string;
      } else if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        const u = await User.findById(token.id).select("role banned").lean();
        const dbUser = u as unknown as { role?: string; banned?: boolean } | null;
        if (dbUser) {
          (session.user as { role?: string }).role = dbUser.role;
          (session.user as { banned?: boolean }).banned = dbUser.banned === true;
        }
      }
      return session;
    },
  },
  events: {
    async signOut() {
      // Clear impersonation on sign out is handled by JWT being discarded
    },
  },
  pages: {
    signIn: "/login",
  },
};

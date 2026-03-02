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

        // Discord connect (link Discord to existing logged-in user).
        if (account.provider === "discord" && "id" in profile && token.id) {
          const discordId = (profile as { id: string }).id;
          const baseName =
            (profile as { global_name?: string }).global_name ??
            (profile as { username?: string }).username ??
            "";
          const disc = (profile as { discriminator?: string }).discriminator;
          const tag =
            disc && disc !== "0" && baseName ? `${baseName}#${disc}` : baseName || (profile as { username?: string }).username || "";

          await User.findByIdAndUpdate(
            token.id as string,
            {
              $set: {
                discordId,
                discordUsername: tag || undefined,
              },
            },
            { new: false }
          ).lean();
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

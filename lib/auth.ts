import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, account, profile, trigger, session, user }) {
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
      if (account?.provider === "google" && profile && "sub" in profile) {
        delete token.impersonatingUserId;
        delete token.impersonatingFrom;
        await connectDB();
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

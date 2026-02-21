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
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile && "sub" in profile) {
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
        const u = dbUser as unknown as { _id: { toString(): string }; role: string };
        token.id = u._id.toString();
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

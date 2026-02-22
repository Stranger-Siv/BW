import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      if (!token) return false;
      if (token.banned) return false;
      return token.role === "admin" || token.role === "super_admin";
    },
  },
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/admin/:path*"],
};

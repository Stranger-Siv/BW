import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      if (!token) return false;
      return token.role === "admin";
    },
  },
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/admin/:path*"],
};

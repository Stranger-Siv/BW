import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    banned?: boolean;
  }

  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      role?: string;
      banned?: boolean;
    };
    /** Set when a super_admin is impersonating another user (real admin's id). */
    impersonatingFrom?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    banned?: boolean;
    /** When set, session.user is the impersonated user. */
    impersonatingUserId?: string;
    /** Real super_admin user id when impersonating. */
    impersonatingFrom?: string;
  }
}

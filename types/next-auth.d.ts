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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    banned?: boolean;
  }
}

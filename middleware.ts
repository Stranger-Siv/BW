import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

// Simple in-memory rate limit buckets (per instance).
type Bucket = { count: number; expiresAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1 minute
const REGISTER_LIMIT = 5; // /api/register
const TEAMS_LIMIT = 10; // /api/tournaments/[id]/teams
const AUTH_LIMIT = 20; // /api/auth/*

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

function checkRateLimit(pathname: string, ip: string): NextResponse | null {
  let limit: number | null = null;

  if (pathname === "/api/register") {
    limit = REGISTER_LIMIT;
  } else if (pathname.startsWith("/api/tournaments/") && pathname.endsWith("/teams")) {
    limit = TEAMS_LIMIT;
  } else if (pathname.startsWith("/api/auth/")) {
    limit = AUTH_LIMIT;
  }

  if (limit == null) return null;

  const key = `${pathname}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    return null;
  }

  if (existing.count >= limit) {
    return NextResponse.json(
      { error: "Too many requests, please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((existing.expiresAt - now) / 1000).toString(),
        },
      }
    );
  }

  existing.count += 1;
  buckets.set(key, existing);
  return null;
}

const adminAuth = withAuth({
  callbacks: {
    authorized: ({ token }) => {
      if (!token) return false;
      if ((token as { banned?: boolean }).banned) return false;
      const role = (token as { role?: string }).role;
      return role === "admin" || role === "super_admin";
    },
  },
  pages: { signIn: "/login" },
});

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Apply rate limiting to selected public APIs.
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(req);
    const limited = checkRateLimit(pathname, ip);
    if (limited) return limited;
  }

  // Protect admin routes with NextAuth.
  if (pathname.startsWith("/admin")) {
    // @ts-expect-error - adminAuth is a middleware-compatible handler
    return adminAuth(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};

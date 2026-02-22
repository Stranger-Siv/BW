"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";

const adminNavLinks: { href: string; label: string; superAdminOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/users", label: "Users", superAdminOnly: true },
  { href: "/admin/settings", label: "Settings", superAdminOnly: true },
  { href: "/admin/audit", label: "Audit", superAdminOnly: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdminOrSuperAdmin = role === "admin" || role === "super_admin";
  const isSuperAdmin = role === "super_admin";

  const linkClass = (isActive: boolean) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
      isActive
        ? "bg-emerald-500/20 text-emerald-300"
        : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-white/5 shadow-lg backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3 md:px-8"
        aria-label="Main"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-bold tracking-tight accent-gradient transition-all duration-300 hover:opacity-90 sm:text-lg min-w-0 truncate"
        >
          <img
            src="/icon.png"
            alt=""
            className="h-8 w-8 shrink-0 rounded-lg object-contain sm:h-9 sm:w-9"
            width={36}
            height={36}
          />
          <span className="truncate">{SITE.name}</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Desktop: main nav links; mobile: these are in BottomNav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/tournaments" className={linkClass(pathname === "/tournaments" || pathname?.startsWith("/tournaments/"))}>
              Tournaments
            </Link>
            {isAdminOrSuperAdmin && adminNavLinks.map(({ href, label, superAdminOnly }) => {
              if (superAdminOnly && !isSuperAdmin) return null;
              // Dashboard is only active on exact /admin so child routes don’t highlight it
              const isActive = href === "/admin" ? pathname === "/admin" : (pathname === href || pathname.startsWith(href + "/"));
              return (
                <Link key={href} href={href} className={linkClass(isActive)}>
                  {label}
                </Link>
              );
            })}
          </div>

          {status === "loading" ? (
            <span className="ml-2 text-sm text-slate-400">…</span>
          ) : session?.user ? (
            <div className="ml-2 flex items-center gap-1 sm:gap-2 sm:ml-4">
              {!isAdminOrSuperAdmin && (
                <Link
                  href="/matches"
                  className={`${linkClass(pathname === "/matches")} hidden md:inline-block`}
                >
                  My matches
                </Link>
              )}
              <Link href="/profile" className={`${linkClass(pathname === "/profile")} hidden md:inline-block`}>
                Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  try {
                    const id = (session?.user as { id?: string })?.id;
                    if (id) {
                      sessionStorage.removeItem(`onboarding_done_${id}`);
                      sessionStorage.removeItem("onboarding_just_completed");
                    }
                  } catch {}
                  signOut({ callbackUrl: "/" });
                }}
                className="hidden md:inline-flex rounded-full px-4 py-2 text-sm font-medium text-slate-400 transition-all duration-300 hover:bg-white/10 hover:text-slate-100"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-gradient ml-2 inline-flex py-2 text-sm sm:py-2.5 sm:ml-4 sm:text-base"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

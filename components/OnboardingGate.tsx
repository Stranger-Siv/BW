"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const ONBOARDING_JUST_COMPLETED = "onboarding_just_completed";
function onboardingDoneKey(userId: string) {
  return `onboarding_done_${userId}`;
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const profileComplete = useRef<boolean | null>(null);

  useEffect(() => {
    if (pathname === "/onboarding") {
      profileComplete.current = null;
      return;
    }
  }, [pathname]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const banned = (session.user as { banned?: boolean }).banned;
    if (banned) {
      if (pathname !== "/banned") router.replace("/banned");
      return;
    }
    if (pathname === "/login" || pathname === "/onboarding") return;
    const userId = (session.user as { id?: string }).id;
    if (!userId) return;

    if (profileComplete.current === true) return;
    if (profileComplete.current === false) {
      try {
        if (sessionStorage.getItem(onboardingDoneKey(userId)) === "1") {
          profileComplete.current = true;
          return;
        }
      } catch {}
      router.replace(`/onboarding?returnUrl=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    try {
      if (sessionStorage.getItem(ONBOARDING_JUST_COMPLETED) === "1") {
        sessionStorage.removeItem(ONBOARDING_JUST_COMPLETED);
        sessionStorage.setItem(onboardingDoneKey(userId), "1");
        profileComplete.current = true;
        return;
      }
      if (sessionStorage.getItem(onboardingDoneKey(userId)) === "1") {
        profileComplete.current = true;
        return;
      }
    } catch {}

    let cancelled = false;
    fetch("/api/users/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (cancelled || !user) return;
        const complete = Boolean(user.displayName?.trim() && user.minecraftIGN?.trim());
        profileComplete.current = complete;
        if (complete) {
          try {
            sessionStorage.setItem(onboardingDoneKey(userId), "1");
          } catch {}
          return;
        }
        try {
          if (sessionStorage.getItem(onboardingDoneKey(userId)) === "1") return;
        } catch {}
        router.replace(`/onboarding?returnUrl=${encodeURIComponent(pathname || "/")}`);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [status, session?.user, pathname, router]);

  return <>{children}</>;
}

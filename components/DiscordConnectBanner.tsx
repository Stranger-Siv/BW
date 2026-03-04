"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type MeResponse = {
  discordId?: string;
  banned?: boolean;
};

export function DiscordConnectBanner() {
  const { status } = useSession();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setShouldShow(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setShouldShow(false);
          return;
        }
        const data = (await res.json()) as MeResponse;
        if (!cancelled) {
          const hasDiscord = !!data.discordId;
          const isBanned = data.banned === true;
          setShouldShow(!hasDiscord && !isBanned);
        }
      } catch {
        if (!cancelled) setShouldShow(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (!shouldShow) return null;

  const handleConnect = () => {
    void signIn("discord", { callbackUrl: "/profile" });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-xs sm:text-sm text-indigo-50">
      <span className="flex items-center gap-2">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/40 text-[10px]" aria-hidden>
          ✓
        </span>
        <span>
          Connect your Discord to get in-game roles (S# M# Player / Champion) and match updates. We only store your Discord ID and tag.
        </span>
      </span>
      <button
        type="button"
        onClick={handleConnect}
        className="rounded-full border border-indigo-300/70 bg-indigo-500/80 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-indigo-400"
      >
        Connect Discord
      </button>
    </div>
  );
}


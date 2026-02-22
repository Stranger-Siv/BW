"use client";

import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

export function ImpersonationBanner() {
  const { data: session, status, update } = useSession();
  const [exiting, setExiting] = useState(false);
  const impersonatingFrom = (session as { impersonatingFrom?: string })?.impersonatingFrom;
  const displayName = session?.user?.name || session?.user?.email || "User";

  const handleExit = useCallback(async () => {
    if (!impersonatingFrom || exiting) return;
    const impersonatedId = (session?.user as { id?: string })?.id;
    setExiting(true);
    try {
      await update({ impersonatingUserId: null });
      if (impersonatedId) {
        await fetch("/api/super-admin/impersonate/exit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ impersonatedUserId: impersonatedId }),
        });
      }
    } finally {
      setExiting(false);
    }
  }, [impersonatingFrom, session?.user, update, exiting]);

  if (status !== "authenticated" || !impersonatingFrom) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-amber-400/40 bg-amber-500/20 px-4 py-2 text-sm text-amber-100">
      <span>
        Viewing as <strong>{displayName}</strong>
      </span>
      <button
        type="button"
        onClick={handleExit}
        disabled={exiting}
        className="rounded-full border border-amber-400/60 bg-amber-500/30 px-3 py-1.5 font-medium text-amber-900 transition hover:bg-amber-500/50 disabled:opacity-60"
      >
        {exiting ? "Exiting…" : "Exit impersonation"}
      </button>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type Profile = {
  displayName?: string;
  minecraftIGN?: string;
  discordUsername?: string;
};

/** Allow only same-origin path (no protocol-relative or absolute URLs) to prevent open redirect */
function safeReturnUrl(raw: string | null): string {
  if (typeof raw !== "string" || !raw.trim()) return "/";
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

function OnboardingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get("returnUrl"));

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [minecraftIGN, setMinecraftIGN] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");

  const isComplete = Boolean(
    profile?.displayName?.trim() && profile?.minecraftIGN?.trim()
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const p = await res.json();
        if (cancelled) return;
        setProfile(p);
        setDisplayName(p.displayName ?? "");
        setMinecraftIGN(p.minecraftIGN ?? "");
        setDiscordUsername(p.discordUsername ?? "");
        if (p.displayName?.trim() && p.minecraftIGN?.trim()) {
          router.replace(returnUrl);
          return;
        }
      } catch {
        if (!cancelled) setError("Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, router, returnUrl]);

  const submit = useCallback(async () => {
    const d = displayName.trim();
    const m = minecraftIGN.trim();
    if (!d) {
      setError("Platform username is required");
      return;
    }
    if (!m) {
      setError("In-game name (Minecraft IGN) is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: d,
          minecraftIGN: m,
          discordUsername: discordUsername.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      try {
        sessionStorage.setItem("onboarding_just_completed", "1");
        const userId = (session?.user as { id?: string })?.id;
        if (userId) sessionStorage.setItem(`onboarding_done_${userId}`, "1");
      } catch {}
      router.replace(returnUrl);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [displayName, minecraftIGN, discordUsername, router, returnUrl, session?.user]);

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          Complete your profile
        </h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Set your in-game name, Discord info, and a username for this platform.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
            {error}
          </div>
        )}

        <div className="card-glass animate-fade-in space-y-4 p-6">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
              Username for platform <span className="text-emerald-400">*</span>
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you want to be shown here"
              className="input-glass w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
              In-game name (Minecraft IGN) <span className="text-emerald-400">*</span>
            </span>
            <input
              type="text"
              value={minecraftIGN}
              onChange={(e) => setMinecraftIGN(e.target.value)}
              placeholder="Your Minecraft username"
              className="input-glass w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
              Discord username
            </span>
            <input
              type="text"
              value={discordUsername}
              onChange={(e) => setDiscordUsername(e.target.value)}
              placeholder="username or username#1234"
              className="input-glass w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="btn-gradient w-full"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          You can update these anytime from your{" "}
          <Link href="/profile" className="font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
            Profile
          </Link>{" "}
          after continuing.
        </p>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><p className="text-slate-400">Loading…</p></main>}>
      <OnboardingContent />
    </Suspense>
  );
}

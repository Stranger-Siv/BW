"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Profile = {
  email: string;
  name: string;
  image?: string | null;
  displayName?: string;
  minecraftIGN?: string;
  discordUsername?: string;
  role: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [minecraftIGN, setMinecraftIGN] = useState("");
  const [discordUsername, setDiscordUsername] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const profileRes = await fetch("/api/users/me", { cache: "no-store" });
        if (profileRes.ok && !cancelled) {
          const p = await profileRes.json();
          setProfile(p);
          setDisplayName(p.displayName ?? "");
          setMinecraftIGN(p.minecraftIGN ?? "");
          setDiscordUsername(p.discordUsername ?? "");
        }
      } catch {
        if (!cancelled) setMessage("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session?.user, router]);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, minecraftIGN, discordUsername }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Failed to save");
        return;
      }
      const updated = {
        ...data,
        displayName: data.displayName != null ? String(data.displayName).trim() || undefined : undefined,
      };
      setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      setDisplayName(updated.displayName ?? "");
      setMinecraftIGN(updated.minecraftIGN ?? "");
      setDiscordUsername(updated.discordUsername ?? "");
      setEditing(false);
      setMessage("Profile updated.");
    } catch {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [displayName, minecraftIGN, discordUsername]);

  if (status === "loading" || loading) {
    return (
      <main className="loading-wrap">
        <p className="loading-text">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-inner-narrow">
        <h1 className="page-title mb-6">Profile</h1>

        {message && (
          <div className="alert-success mb-4">
            {message}
          </div>
        )}

        <div className="card mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {profile?.image && (
                <img src={profile.image} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10" />
              )}
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {profile?.displayName || profile?.name || "—"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.email}</p>
              </div>
            </div>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary shrink-0"
                aria-label="Edit profile"
              >
                Edit ✏️
              </button>
            )}
          </div>
          {editing ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Username for platform</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-glass w-full rounded-xl px-4 py-2.5"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Minecraft IGN</span>
                  <input
                    type="text"
                    value={minecraftIGN}
                    onChange={(e) => setMinecraftIGN(e.target.value)}
                    className="input-glass w-full rounded-xl px-4 py-2.5"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Discord username</span>
                  <input
                    type="text"
                    value={discordUsername}
                    onChange={(e) => setDiscordUsername(e.target.value)}
                    className="input-glass w-full rounded-xl px-4 py-2.5"
                  />
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={saveProfile} disabled={saving} className="btn-gradient">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDisplayName(profile?.displayName ?? "");
                    setMinecraftIGN(profile?.minecraftIGN ?? "");
                    setDiscordUsername(profile?.discordUsername ?? "");
                  }}
                  disabled={saving}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Username</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{profile?.displayName || profile?.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Minecraft IGN</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{profile?.minecraftIGN || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Discord username</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{profile?.discordUsername || "—"}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Sign out: shown on small screens only (nav Sign out is hidden on mobile) */}
        <div className="mt-8 md:hidden">
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
            className="w-full rounded-xl border border-red-500/40 bg-red-500/10 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
          >
            Sign out
          </button>
        </div>

        <p className="mt-8">
          <Link href="/tournaments" className="back-link">
            ← Back to Tournaments
          </Link>
        </p>
      </div>
    </main>
  );
}

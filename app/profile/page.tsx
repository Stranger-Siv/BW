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


type Invite = {
  _id: string;
  status: string;
  teamName: string;
  captainId: { name: string; displayName?: string; email?: string; image?: string };
  tournamentId: { name: string; date: string; teamSize: number };
  createdAt: string;
};

type TeamRow = {
  _id: string;
  teamName: string;
  tournamentId?: { name?: string; date?: string } | string;
  status: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
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
        const [profileRes, invitesRes, teamsRes] = await Promise.all([
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/invites?type=received"),
          fetch("/api/users/me/teams"),
        ]);
        if (profileRes.ok && !cancelled) {
          const p = await profileRes.json();
          setProfile(p);
          setDisplayName(p.displayName ?? "");
          setMinecraftIGN(p.minecraftIGN ?? "");
          setDiscordUsername(p.discordUsername ?? "");
        }
        if (invitesRes.ok && !cancelled) {
          const inv = await invitesRes.json();
          setInvites(Array.isArray(inv) ? inv : []);
        }
        if (teamsRes.ok && !cancelled) {
          const t = await teamsRes.json();
          setTeams(Array.isArray(t) ? t : []);
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

  const respondToInvite = useCallback(async (inviteId: string, action: "accept" | "reject") => {
    setMessage("");
    try {
      const res = await fetch(`/api/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Failed");
        return;
      }
      setMessage(data.message ?? (action === "accept" ? "Accepted!" : "Declined."));
      setInvites((prev) => prev.filter((i) => i._id !== inviteId));
      if (action === "accept") {
        const teamsRes = await fetch("/api/users/me/teams", { cache: "no-store" });
        if (teamsRes.ok) {
          const t = await teamsRes.json();
          setTeams(Array.isArray(t) ? t : []);
        }
      }
    } catch {
      setMessage("Request failed");
    }
  }, []);

  if (status === "loading" || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 md:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
          Profile
        </h1>

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            {message}
          </div>
        )}

        <div className="card-glass mb-8 p-6">
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
                className="shrink-0 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/15 dark:text-slate-200 dark:hover:bg-white/15"
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
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/15 dark:text-slate-200 dark:hover:bg-white/15"
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

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-100">Team invites</h2>
          {invites.length === 0 ? (
            <p className="card-glass p-4 text-sm text-slate-500 dark:text-slate-400">
              No pending invites.
            </p>
          ) : (
            <ul className="space-y-3">
              {invites.map((inv) => (
                <li key={inv._id} className="card-glass flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {(inv.captainId as { displayName?: string; name?: string })?.displayName || (inv.captainId as { name?: string })?.name} invited you to join <strong>{inv.teamName}</strong>
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {(inv.tournamentId as { name?: string })?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => respondToInvite(inv._id, "accept")}
                      className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-1.5 text-sm font-medium text-slate-900 transition hover:opacity-90"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respondToInvite(inv._id, "reject")}
                      className="rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/15 dark:text-slate-400 dark:hover:bg-white/15"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-100">My teams</h2>
          {teams.length === 0 ? (
            <p className="card-glass p-4 text-sm text-slate-500 dark:text-slate-400">
              You are not on any teams yet. Register for a tournament or accept an invite.
            </p>
          ) : (
            <ul className="space-y-2">
              {teams.map((team) => (
                <li key={team._id}>
                  <Link
                    href={`/profile/teams/${team._id}`}
                    className="card-glass block px-4 py-3 transition hover:border-emerald-400/30 hover:shadow-lg dark:hover:border-emerald-500/20"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">{team.teamName}</span>
                    <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                      {typeof team.tournamentId === "object" && team.tournamentId?.name ? ` · ${team.tournamentId.name}` : ""} ({team.status})
                    </span>
                    <span className="ml-2 text-xs text-emerald-400 dark:text-emerald-300">View details →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

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
          <Link href="/tournaments" className="text-sm font-medium text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300">
            ← Back to Tournaments
          </Link>
        </p>
      </div>
    </main>
  );
}

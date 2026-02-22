"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type UserRow = {
  _id: string;
  email: string;
  name: string;
  displayName?: string | null;
  minecraftIGN?: string | null;
  discordUsername?: string | null;
  role: string;
  banned: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const isSuperAdmin = role === "super_admin";

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/super-admin/users", { cache: "no-store" });
    if (res.status === 403) {
      setError("Only super admins can manage users.");
      setUsers([]);
      return;
    }
    if (!res.ok) {
      setError("Failed to load users");
      setUsers([]);
      return;
    }
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setError(null);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;
    if (!isSuperAdmin) {
      setLoading(false);
      setError("Only super admins can access this page.");
      return;
    }
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, [status, isSuperAdmin, router, fetchUsers]);

  const updateUser = useCallback(
    async (userId: string, updates: { role?: string; banned?: boolean }) => {
      setActionLoadingId(userId);
      setMessage(null);
      try {
        const res = await fetch(`/api/super-admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.error ?? "Update failed");
          return;
        }
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, role: updates.role ?? u.role, banned: updates.banned ?? u.banned }
              : u
          )
        );
        setMessage("Saved.");
        setTimeout(() => setMessage(null), 3000);
      } catch {
        setMessage("Request failed");
      } finally {
        setActionLoadingId(null);
      }
    },
    []
  );

  if (status === "loading" || (isSuperAdmin && loading)) {
    return (
      <main className="loading-wrap">
        <div className="loading-spinner border-amber-500" aria-hidden />
        <p className="loading-text">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-inner-wide max-w-5xl">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/admin" className="back-link text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300">
            ← Admin
          </Link>
          <span className="text-slate-500 dark:text-slate-400">/</span>
          <span className="text-slate-600 dark:text-slate-300">Users</span>
        </nav>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Manage users
        </h1>
        <p className="mb-6 text-slate-600 dark:text-slate-400">
          Change roles (player, admin, super_admin) and ban or unban accounts. Only super admins can access this page.
        </p>

        {!isSuperAdmin && (
          <div className="card-glass rounded-xl border-amber-400/30 bg-amber-500/10 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-amber-200">You need super admin access to manage users.</p>
            <Link href="/admin" className="mt-3 inline-block text-sm font-medium text-amber-400 hover:text-amber-300">
              ← Back to Admin
            </Link>
          </div>
        )}

        {isSuperAdmin && (
          <>
            {message && (
              <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 dark:border-red-500/30 dark:bg-red-500/10">
                {error}
              </div>
            )}

            <div className="card-glass overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">User</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">IGN · Discord</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Role</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const loading = actionLoadingId === u._id;
                    const isSelf = u._id === (session?.user as { id?: string })?.id;
                    return (
                      <tr
                        key={u._id}
                        className="border-b border-white/10 last:border-0 hover:bg-white/5"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {u.displayName || u.name || u.email}
                              {isSelf && (
                                <span className="ml-2 rounded bg-slate-500/20 px-1.5 py-0.5 text-xs text-slate-300">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                              {u.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {u.minecraftIGN || "—"} · {u.discordUsername || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => updateUser(u._id, { role: e.target.value })}
                            disabled={loading || isSelf}
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:ring-2 focus:ring-amber-400/40 disabled:opacity-60"
                          >
                            <option value="player">Player</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {u.banned ? (
                            <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
                              Banned
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isSelf ? (
                            <span className="text-xs text-slate-500">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateUser(u._id, { banned: !u.banned })}
                              disabled={loading}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                                u.banned
                                  ? "border border-emerald-400/50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                  : "border border-red-400/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              }`}
                            >
                              {u.banned ? "Unban" : "Ban"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && !error && (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  No users found.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

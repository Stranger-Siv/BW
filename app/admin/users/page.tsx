"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminUsersSkeleton } from "@/components/admin/AdminSkeletons";

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
  const { data: session, status, update } = useSession();
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

  const startImpersonate = useCallback(
    async (userId: string) => {
      try {
        const res = await fetch("/api/super-admin/impersonate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessage(data.error ?? "Failed to start impersonation");
          return;
        }
        await update({ impersonatingUserId: userId });
        router.push("/");
      } catch {
        setMessage("Failed to start impersonation");
      }
    },
    [router, update]
  );

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
    return <AdminUsersSkeleton />;
  }

  return (
    <main className="page pb-bottom-nav">
      <div className="page-inner-wide max-w-5xl">
        <AdminBreadcrumbs
          items={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
          className="mb-4"
        />

        <h1 className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
          Manage users
        </h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
          Change roles (player, admin, super_admin) and ban or unban accounts. Only super admins can access this page.
        </p>

        {!isSuperAdmin && (
          <div className="card-glass rounded-xl border-amber-400/30 bg-amber-500/10 p-4 dark:border-amber-500/30 dark:bg-amber-500/10 sm:p-6">
            <p className="text-amber-200">You need super admin access to manage users.</p>
            <Link href="/admin" className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-amber-400 hover:text-amber-300">
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

            {/* Mobile: card list */}
            <div className="space-y-3 md:hidden">
              {users.length === 0 && !error && (
                <div className="card-glass py-12 text-center text-slate-500 dark:text-slate-400">
                  No users found.
                </div>
              )}
              {users.map((u) => {
                const loading = actionLoadingId === u._id;
                const isSelf = u._id === (session?.user as { id?: string })?.id;
                return (
                  <div
                    key={u._id}
                    className="card-glass rounded-xl border border-white/10 p-4"
                  >
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {u.displayName || u.name || u.email}
                      {isSelf && (
                        <span className="ml-2 rounded bg-slate-500/20 px-1.5 py-0.5 text-xs text-slate-300">
                          You
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {u.email}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {u.minecraftIGN || "—"} · {u.discordUsername || "—"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => updateUser(u._id, { role: e.target.value })}
                        disabled={loading || isSelf}
                        className="min-h-[44px] flex-1 min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-amber-400/40 disabled:opacity-60"
                        aria-label={`Role for ${u.displayName || u.email}`}
                      >
                        <option value="player">Player</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super admin</option>
                      </select>
                      <span className={`rounded px-2 py-1 text-xs font-medium ${u.banned ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                        {u.banned ? "Banned" : "Active"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => startImpersonate(u._id)}
                          className="min-h-[44px] rounded-full border border-slate-400/50 bg-slate-500/20 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-500/30"
                        >
                          Impersonate
                        </button>
                      )}
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => updateUser(u._id, { banned: !u.banned })}
                          disabled={loading}
                          className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                            u.banned
                              ? "border border-emerald-400/50 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                              : "border border-red-400/50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                        >
                          {u.banned ? "Unban" : "Ban"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="card-glass admin-table-wrap hidden md:block">
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
                        <td className="px-4 py-3 flex flex-wrap items-center gap-2">
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => startImpersonate(u._id)}
                              className="min-h-[44px] rounded-full border border-slate-400/50 bg-slate-500/20 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-500/30 sm:min-h-[36px] sm:py-1.5"
                            >
                              Impersonate
                            </button>
                          )}
                          {isSelf ? (
                            <span className="text-xs text-slate-500">—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateUser(u._id, { banned: !u.banned })}
                              disabled={loading}
                              className={`min-h-[44px] rounded-full px-3 py-2 text-xs font-medium transition disabled:opacity-60 sm:min-h-[36px] sm:py-1.5 ${
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

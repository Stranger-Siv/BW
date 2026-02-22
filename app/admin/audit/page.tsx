"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminAuditSkeleton } from "@/components/admin/AdminSkeletons";
import { formatDateTime } from "@/lib/formatDate";

const PAGE_SIZE = 50;

type AuditLogRow = {
  _id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

export default function AdminAuditPage() {
  const { data: session, status } = useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (skip: number, append: boolean) => {
    const setLoader = append ? setLoadingMore : setLoading;
    setLoader(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/audit?limit=${PAGE_SIZE}&skip=${skip}`, { cache: "no-store" });
      if (res.status === 403) {
        setError("Only super admins can view the audit log.");
        if (!append) setLogs([]);
        return;
      }
      if (!res.ok) {
        setError("Failed to load audit log");
        if (!append) setLogs([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.logs) ? data.logs : [];
      const tot = typeof data.total === "number" ? data.total : 0;
      setTotal(tot);
      if (append) {
        setLogs((prev) => [...prev, ...list]);
      } else {
        setLogs(list);
      }
    } finally {
      setLoader(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" || !isSuperAdmin) return;
    fetchLogs(0, false);
  }, [status, isSuperAdmin, fetchLogs]);

  const loadMore = useCallback(() => {
    if (loadingMore || logs.length >= total) return;
    fetchLogs(logs.length, true);
  }, [loadingMore, logs.length, total, fetchLogs]);

  if (status === "loading" || (isSuperAdmin && loading && logs.length === 0)) {
    return <AdminAuditSkeleton />;
  }

  return (
    <main className="page pb-bottom-nav">
      <div className="page-inner-wide max-w-6xl">
        <AdminBreadcrumbs
          items={[{ label: "Admin", href: "/admin" }, { label: "Audit log" }]}
          className="mb-4"
        />

        <h1 className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl md:text-3xl">
          Audit log
        </h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
          Who did what, when. Only super admins can view this page.
        </p>

        {!isSuperAdmin && (
          <div className="card-glass rounded-xl border-amber-400/30 bg-amber-500/10 p-4 dark:border-amber-500/30 dark:bg-amber-500/10 sm:p-6">
            <p className="text-amber-200">You need super admin access to view the audit log.</p>
            <Link href="/admin" className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-amber-400 hover:text-amber-300">
              ← Back to Admin
            </Link>
          </div>
        )}

        {isSuperAdmin && error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {isSuperAdmin && !error && (
          <>
            <div className="admin-table-wrap -mx-2 rounded-xl border border-slate-600/40 bg-slate-800/40 sm:mx-0 dark:border-slate-500/30 dark:bg-slate-800/60">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-600/50 text-slate-400 dark:border-slate-500/50 dark:text-slate-400">
                    <th className="px-3 py-3 font-medium sm:px-4">When</th>
                    <th className="px-3 py-3 font-medium sm:px-4">Actor</th>
                    <th className="px-3 py-3 font-medium sm:px-4">Action</th>
                    <th className="px-3 py-3 font-medium sm:px-4">Target</th>
                    <th className="px-3 py-3 font-medium sm:px-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No audit entries yet.
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b border-slate-600/30 dark:border-slate-500/30">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-300 sm:px-4 dark:text-slate-300">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-slate-200 sm:px-4 dark:text-slate-200">{log.actorName}</td>
                      <td className="px-3 py-3 font-mono text-amber-400/90 sm:px-4">{log.action}</td>
                      <td className="px-3 py-3 text-slate-300 sm:px-4 dark:text-slate-300">
                        {log.targetType}
                        {log.targetId ? ` · ${String(log.targetId).slice(0, 8)}…` : ""}
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-3 text-slate-400 sm:px-4 dark:text-slate-400">
                        {log.details && Object.keys(log.details).length > 0
                          ? JSON.stringify(log.details)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length < total && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="admin-touch-btn rounded-full border border-slate-500/50 bg-slate-600/30 text-slate-200 hover:bg-slate-600/50 disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

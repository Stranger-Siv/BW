"use client";

const skeletonClass = "rounded bg-slate-200/80 dark:bg-slate-700/80 animate-pulse";

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`h-4 ${skeletonClass} ${className}`} aria-hidden />;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`${skeletonClass} ${className}`} aria-hidden />;
}

/** Dashboard: breadcrumb, title, dropdown, stats grid, table/cards area */
export function AdminDashboardSkeleton() {
  return (
    <main className="page pb-bottom-nav">
      <div className="page-inner-wide max-w-7xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <SkeletonBar className="w-16" />
          <SkeletonBar className="w-24" />
        </div>
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <SkeletonBar className="h-8 w-48 sm:w-56" />
          <div className="flex gap-2">
            <SkeletonBlock className="h-11 w-28" />
            <SkeletonBlock className="h-11 w-32" />
          </div>
        </header>
        <div className="card-lg shadow-lg p-4 sm:p-6 md:p-8">
          <SkeletonBar className="mb-2 h-6 w-40" />
          <SkeletonBlock className="mb-6 h-12 w-full max-w-md rounded-xl" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-glass p-4 sm:p-5">
                <SkeletonBar className="w-20" />
                <SkeletonBar className="mt-2 h-8 w-14" />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <SkeletonBar className="mb-4 h-5 w-36" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-white/10 p-3 dark:border-white/10">
                  <SkeletonBar className="w-24 flex-shrink-0" />
                  <SkeletonBar className="flex-1" />
                  <SkeletonBar className="w-20 flex-shrink-0" />
                  <SkeletonBar className="w-16 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Generic table skeleton: header + N rows */
export function AdminTableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="admin-table-wrap rounded-xl border border-slate-600/40 bg-slate-800/40 dark:border-slate-500/30 dark:bg-slate-800/60">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-600/50 dark:border-slate-500/50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-3 py-3 sm:px-4">
                <SkeletonBar className="h-4 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri} className="border-b border-slate-600/30 last:border-0 dark:border-slate-500/30">
              {Array.from({ length: cols }).map((_, ci) => (
                <td key={ci} className="px-3 py-3 sm:px-4">
                  <SkeletonBar className={ci === 0 ? "w-32" : "w-20"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Users page: breadcrumb, title, then card list (mobile) or table (desktop) */
export function AdminUsersSkeleton() {
  return (
    <main className="page pb-bottom-nav">
      <div className="page-inner-wide max-w-5xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <SkeletonBar className="w-14" />
          <SkeletonBar className="w-16" />
        </div>
        <SkeletonBar className="mb-2 h-8 w-40" />
        <SkeletonBar className="mb-6 h-4 w-full max-w-xl" />
        <div className="space-y-3 md:hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-glass rounded-xl p-4">
              <SkeletonBar className="h-5 w-36" />
              <SkeletonBar className="mt-1 h-3 w-48" />
              <SkeletonBar className="mt-2 h-3 w-32" />
              <div className="mt-3 flex gap-2">
                <SkeletonBlock className="h-10 flex-1 rounded-lg" />
                <SkeletonBar className="h-6 w-14 rounded-full" />
              </div>
              <div className="mt-3 flex gap-2">
                <SkeletonBlock className="h-11 w-24 rounded-full" />
                <SkeletonBlock className="h-11 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block">
          <AdminTableSkeleton rows={5} cols={5} />
        </div>
      </div>
    </main>
  );
}

/** Settings page: two sections */
export function AdminSettingsSkeleton() {
  return (
    <main className="page pb-bottom-nav">
      <div className="page-inner-wide max-w-2xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <SkeletonBar className="w-14" />
          <SkeletonBar className="w-20" />
        </div>
        <SkeletonBar className="mb-2 h-8 w-48" />
        <SkeletonBar className="mb-6 h-4 w-full" />
        <section className="card-glass mb-6 rounded-xl p-4 sm:p-6">
          <SkeletonBar className="mb-3 h-5 w-36" />
          <SkeletonBar className="mb-4 h-4 w-full" />
          <SkeletonBar className="mb-3 h-4 w-24" />
          <div className="flex gap-3">
            <SkeletonBlock className="h-11 w-24 rounded-full" />
            <SkeletonBlock className="h-11 w-24 rounded-full" />
          </div>
        </section>
        <section className="card-glass rounded-xl p-4 sm:p-6">
          <SkeletonBar className="mb-3 h-5 w-28" />
          <SkeletonBar className="mb-4 h-4 w-full" />
          <SkeletonBlock className="mb-4 h-20 w-full rounded-lg" />
          <SkeletonBar className="mb-4 h-5 w-32" />
          <SkeletonBlock className="h-11 w-40 rounded-full" />
        </section>
      </div>
    </main>
  );
}

/** Audit page: table */
export function AdminAuditSkeleton() {
  return (
    <main className="page pb-bottom-nav">
      <div className="page-inner-wide max-w-6xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <SkeletonBar className="w-14" />
          <SkeletonBar className="w-20" />
        </div>
        <SkeletonBar className="mb-2 h-8 w-28" />
        <SkeletonBar className="mb-6 h-4 w-72" />
        <AdminTableSkeleton rows={8} cols={5} />
        <div className="mt-4 flex justify-center">
          <SkeletonBlock className="h-11 w-28 rounded-full" />
        </div>
      </div>
    </main>
  );
}

/** Tournaments list page */
export function AdminTournamentsSkeleton() {
  return (
    <main className="min-h-screen pb-bottom-nav">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 md:px-6 md:py-10 lg:px-8 lg:py-12">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SkeletonBar className="h-8 w-40" />
            <SkeletonBar className="mt-2 h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-11 w-28 rounded-full" />
            <SkeletonBlock className="h-11 w-36 rounded-full" />
          </div>
        </header>
        <div className="card-glass p-4 shadow-lg sm:p-6 md:p-8">
          <AdminTableSkeleton rows={5} cols={6} />
        </div>
      </div>
    </main>
  );
}

/** Rounds page: header, add-round row, winner block, round cards */
export function AdminRoundsSkeleton() {
  return (
    <main className="min-h-screen pb-bottom-nav bg-slate-300/90 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <SkeletonBar className="h-4 w-28" />
          <SkeletonBar className="h-7 w-48" />
        </div>
        <div className="mb-6 flex flex-wrap gap-3">
          <SkeletonBlock className="h-11 w-full rounded-lg sm:w-56" />
          <SkeletonBlock className="h-11 w-28 rounded-lg" />
        </div>
        <div className="mb-6 rounded-xl border border-slate-400/40 bg-slate-100/80 p-4 dark:border-slate-600 dark:bg-slate-800/60">
          <SkeletonBar className="mb-2 h-4 w-24" />
          <SkeletonBar className="h-10 w-full max-w-xs" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-slate-400/40 bg-slate-100/80 p-4 dark:border-slate-600 dark:bg-slate-800/60">
              <SkeletonBar className="mb-3 h-5 w-32" />
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-9 w-28 rounded-lg" />
                <SkeletonBlock className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/** Team detail page: header card + two section cards */
export function AdminTeamDetailSkeleton() {
  return (
    <main className="min-h-screen pb-bottom-nav px-4 py-6 sm:px-6 md:px-8 lg:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <SkeletonBar className="w-14" />
          <SkeletonBar className="w-24" />
        </div>
        <header className="card-glass mb-6 p-4 sm:p-6 md:p-8">
          <SkeletonBar className="h-8 w-56 sm:w-72" />
          <div className="mt-2 flex gap-2">
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBar className="h-4 w-32" />
          </div>
          <div className="mt-4 flex gap-2">
            <SkeletonBlock className="h-11 w-40 rounded-full" />
          </div>
        </header>
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <section className="card-glass p-4 sm:p-6">
            <SkeletonBar className="mb-4 h-4 w-28" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="mt-2 h-4 w-2/3" />
            <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-white/10">
              <SkeletonBlock className="h-11 w-24 rounded-full" />
              <SkeletonBlock className="h-11 w-20 rounded-full" />
              <SkeletonBlock className="h-11 w-40 rounded-full" />
            </div>
          </section>
          <section className="card-glass p-4 sm:p-6">
            <SkeletonBar className="mb-4 h-4 w-24" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="mt-2 h-4 w-20" />
          </section>
        </div>
        <section className="card-glass mt-4 p-4 sm:p-6 lg:col-span-2">
          <SkeletonBar className="mb-4 h-4 w-40" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-full" />
          </div>
        </section>
      </div>
    </main>
  );
}

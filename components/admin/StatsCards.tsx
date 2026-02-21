"use client";

type StatsCardsProps = {
  totalTeams: number;
  maxSlots: number;
  remainingSlots: number;
  isClosed: boolean;
};

export function StatsCards({
  totalTeams,
  maxSlots,
  remainingSlots,
  isClosed,
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
      <div className="card-glass relative overflow-hidden p-5 transition-all duration-300 hover:shadow-lg">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Total teams
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-800 dark:text-slate-100">
          {totalTeams}
        </p>
      </div>
      <div className="card-glass relative overflow-hidden p-5 transition-all duration-300 hover:shadow-lg">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Max slots
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-800 dark:text-slate-100">
          {maxSlots}
        </p>
      </div>
      <div className="card-glass relative overflow-hidden p-5 transition-all duration-300 hover:shadow-lg">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Remaining
        </p>
        <p className="mt-1 text-3xl font-bold text-slate-800 dark:text-slate-100">
          {remainingSlots}
        </p>
      </div>
      <div className="card-glass relative overflow-hidden p-5 transition-all duration-300 hover:shadow-lg">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Status
        </p>
        <div className="mt-1">
          {isClosed ? (
            <span className="inline-flex rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-400 shadow-sm dark:bg-red-500/20 dark:text-red-300">
              Closed
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-400 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-300">
              Open
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

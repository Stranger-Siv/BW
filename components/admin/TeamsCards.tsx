"use client";

import { formatDateTime } from "@/lib/formatDate";
import type { AdminTeam } from "./TeamsTable";

type TeamsCardsProps = {
  teams: AdminTeam[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onApprove: (team: AdminTeam) => void;
  onReject: (team: AdminTeam) => void;
  onChangeDate: (team: AdminTeam) => void;
  onDisband: (team: AdminTeam) => void;
  actionLoadingId: string | null;
  bulkLoading?: boolean;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400 dark:text-amber-300",
    approved: "bg-emerald-500/20 text-emerald-400 dark:text-emerald-300",
    rejected: "bg-red-500/20 text-red-400 dark:text-red-300",
  };
  const cls = styles[status] ?? "bg-slate-500/20 text-slate-400 dark:text-slate-300";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

export function TeamsCards({
  teams,
  selectedIds,
  onToggleSelect,
  onApprove,
  onReject,
  onChangeDate,
  onDisband,
  actionLoadingId,
  bulkLoading = false,
}: TeamsCardsProps) {
  if (teams.length === 0) {
    return (
      <div className="card-glass py-12 text-center text-slate-500 dark:text-slate-400">
        No teams registered.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const loading = bulkLoading || actionLoadingId === team._id;
        const isSelected = selectedIds.has(team._id);
        return (
          <div
            key={team._id}
            className={`card-glass p-4 transition-all duration-300 hover:shadow-lg ${isSelected ? "ring-2 ring-emerald-400/50 dark:ring-emerald-500/50" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(team._id)}
                  aria-label={`Select ${team.teamName}`}
                  className="h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400/50 dark:border-white/20"
                />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                  {team.teamName}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={team.status} />
                <span className="inline-flex rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400 dark:text-emerald-300">
                  {team.rewardReceiverIGN}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatDateTime(team.createdAt)}
            </p>
            <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 dark:border-white/10">
              {team.players.map((p, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{p.minecraftIGN}</span>
                  <span className="text-slate-500 dark:text-slate-400"> · {p.discordUsername}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {team.status !== "approved" && (
                <button
                  type="button"
                  onClick={() => onApprove(team)}
                  disabled={loading}
                  className="min-h-[44px] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:opacity-90 disabled:opacity-60"
                >
                  Approve
                </button>
              )}
              {team.status !== "rejected" && (
                <button
                  type="button"
                  onClick={() => onReject(team)}
                  disabled={loading}
                  className="min-h-[44px] rounded-full border border-amber-400/50 bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/30 disabled:opacity-60 dark:text-amber-300"
                >
                  Reject
                </button>
              )}
              <button
                type="button"
                onClick={() => onChangeDate(team)}
                disabled={loading}
                className="min-h-[44px] rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/15 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-white/15"
              >
                Change date
              </button>
              <button
                type="button"
                onClick={() => onDisband(team)}
                disabled={loading}
                className="min-h-[44px] rounded-full border border-red-400/50 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/30 disabled:opacity-60 dark:text-red-300"
              >
                Disband
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

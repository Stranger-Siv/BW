"use client";

import { formatDateTime } from "@/lib/formatDate";

export type AdminTeam = {
  _id: string;
  teamName: string;
  tournamentDate: string;
  players: { minecraftIGN: string; discordUsername: string }[];
  rewardReceiverIGN: string;
  status: string;
  createdAt: string;
};

type TeamsTableProps = {
  teams: AdminTeam[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onApprove: (team: AdminTeam) => void;
  onReject: (team: AdminTeam) => void;
  onChangeDate: (team: AdminTeam) => void;
  onDisband: (team: AdminTeam) => void;
  actionLoadingId: string | null;
  bulkLoading?: boolean;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-amber-500/20 text-amber-400 shadow-sm dark:bg-amber-500/20 dark:text-amber-300",
    approved:
      "bg-emerald-500/20 text-emerald-400 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-300",
    rejected:
      "bg-red-500/20 text-red-400 shadow-sm dark:bg-red-500/20 dark:text-red-300",
  };
  const cls = styles[status] ?? "bg-slate-500/20 text-slate-400 dark:text-slate-300";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

export function TeamsTable({
  teams,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onApprove,
  onReject,
  onChangeDate,
  onDisband,
  actionLoadingId,
  bulkLoading = false,
}: TeamsTableProps) {
  if (teams.length === 0) {
    return (
      <div className="card-glass py-12 text-center text-slate-500 dark:text-slate-400">
        No teams registered.
      </div>
    );
  }

  const allSelected = teams.length > 0 && teams.every((t) => selectedIds.has(t._id));

  return (
    <div className="card-glass overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 dark:border-white/10">
            <th className="w-10 px-2 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                aria-label="Select all teams"
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400/50 dark:border-white/20"
              />
            </th>
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
              Team name
            </th>
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
              Players
            </th>
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
              Reward receiver
            </th>
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
              Status
            </th>
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
              Created
            </th>
            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const loading = bulkLoading || actionLoadingId === team._id;
            const isSelected = selectedIds.has(team._id);
            return (
              <tr
                key={team._id}
                className={`border-b border-white/10 transition last:border-0 hover:bg-white/5 dark:border-white/10 dark:hover:bg-white/5 ${isSelected ? "bg-emerald-500/5 dark:bg-emerald-500/5" : ""}`}
              >
                <td className="w-10 px-2 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(team._id)}
                    aria-label={`Select ${team.teamName}`}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400/50 dark:border-white/20"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                  {team.teamName}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  <ul className="space-y-0.5">
                    {team.players.map((p, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-medium">{p.minecraftIGN}</span>
                        <span className="text-slate-500 dark:text-slate-400"> · {p.discordUsername}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400 dark:text-emerald-300">
                    {team.rewardReceiverIGN}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={team.status} />
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {formatDateTime(team.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {team.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => onApprove(team)}
                        disabled={loading}
                        className="min-h-[36px] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:opacity-90 disabled:opacity-60"
                      >
                        Approve
                      </button>
                    )}
                    {team.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => onReject(team)}
                        disabled={loading}
                        className="min-h-[36px] rounded-full border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/30 disabled:opacity-60 dark:text-amber-300"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onChangeDate(team)}
                      disabled={loading}
                      className="min-h-[36px] rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/15 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-white/15"
                    >
                      Change date
                    </button>
                    <button
                      type="button"
                      onClick={() => onDisband(team)}
                      disabled={loading}
                      className="min-h-[36px] rounded-full border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/30 disabled:opacity-60 dark:text-red-300"
                    >
                      Disband
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { formatDateLabel } from "@/lib/formatDate";

export type DateOption = {
  _id: string;
  date: string;
  maxTeams: number;
  registeredTeams: number;
  isClosed: boolean;
};

export type TournamentOption = {
  _id: string;
  name: string;
  date: string;
  maxTeams: number;
  registeredTeams: number;
  isClosed: boolean;
};

type ChangeDateModalProps = {
  open: boolean;
  teamName: string;
  currentDate: string;
  dates: DateOption[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
  /** When provided, modal shows "Change tournament" and uses tournament IDs */
  tournaments?: TournamentOption[] | null;
  currentTournamentId?: string | null;
  selectedTournamentId?: string;
  onSelectTournamentId?: (id: string) => void;
};

export function ChangeDateModal({
  open,
  teamName,
  currentDate,
  dates,
  selectedDate,
  onSelectDate,
  onConfirm,
  onCancel,
  loading = false,
  error = null,
  tournaments = null,
  currentTournamentId = null,
  selectedTournamentId = "",
  onSelectTournamentId,
}: ChangeDateModalProps) {
  if (!open) return null;

  const useTournaments = Array.isArray(tournaments) && tournaments.length > 0;

  const dateOptions = dates.filter((d) => d.date !== currentDate);
  const tournamentOptions = useTournaments
    ? tournaments.filter((t) => t._id !== currentTournamentId)
    : [];

  const value = useTournaments ? selectedTournamentId : selectedDate;
  const onSelect = useTournaments
    ? (v: string) => onSelectTournamentId?.(v)
    : onSelectDate;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-date-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
        aria-hidden
      />
      <div className="card-glass relative w-full max-w-[calc(100%-2rem)] rounded-t-2xl p-5 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <h2 id="change-date-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {useTournaments ? "Change tournament for" : "Change date for"} {teamName}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {useTournaments && currentTournamentId
            ? `Current: ${tournaments?.find((t) => t._id === currentTournamentId)?.name ?? "—"}`
            : `Current: ${formatDateLabel(currentDate)}`}
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            {useTournaments ? "New tournament" : "New tournament date"}
          </span>
          <select
            value={value}
            onChange={(e) => onSelect(e.target.value)}
            className="input-glass w-full min-h-[48px] rounded-xl sm:min-h-0 sm:py-2.5 sm:text-sm"
          >
            <option value="">Select {useTournaments ? "tournament" : "date"}</option>
            {useTournaments
              ? tournamentOptions.map((t) => {
                  const remaining = t.maxTeams - t.registeredTeams;
                  const full = remaining <= 0 || t.isClosed;
                  const label = full
                    ? `${t.name} (${formatDateLabel(t.date)}) — Full`
                    : `${t.name} (${formatDateLabel(t.date)}) — ${remaining} left`;
                  return (
                    <option key={t._id} value={t._id} disabled={full}>
                      {label}
                    </option>
                  );
                })
              : dateOptions.map((d) => {
                  const remaining = d.maxTeams - d.registeredTeams;
                  const full = remaining <= 0 || d.isClosed;
                  const label = full
                    ? `${formatDateLabel(d.date)} (Full)`
                    : `${formatDateLabel(d.date)} (${remaining} left)`;
                  return (
                    <option key={d._id} value={d.date} disabled={full}>
                      {label}
                    </option>
                  );
                })}
          </select>
        </label>
        {error && (
          <p className="mt-2 text-sm text-red-400 dark:text-red-300">{error}</p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[48px] rounded-full border border-white/10 bg-white/10 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-white/15 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-white/15 sm:min-h-0 sm:py-2 sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !value}
            className="btn-gradient min-h-[48px] px-4 py-3 text-base sm:min-h-0 sm:py-2 sm:text-sm"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                Moving…
              </span>
            ) : (
              "Move team"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

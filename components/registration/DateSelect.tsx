"use client";

import { formatDateLabel } from "@/lib/formatDate";

export type TournamentDateOption = {
  _id: string;
  date: string;
  maxTeams: number;
  registeredTeams: number;
  isClosed: boolean;
};

type DateSelectProps = {
  dates: TournamentDateOption[];
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  id?: string;
};

export function DateSelect({ dates, value, onChange, disabled, id = "tournament-date" }: DateSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full min-h-[48px] rounded-lg border border-slate-400/60 bg-slate-100 px-4 py-3 text-base text-slate-800 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-offset-slate-900 sm:min-h-0 sm:py-2.5 sm:text-sm"
      aria-label="Tournament date"
    >
      <option value="">Select tournament date</option>
      {dates.map((d) => {
        const remaining = d.maxTeams - d.registeredTeams;
        const full = remaining <= 0 || d.isClosed;
        const label = full
          ? `${formatDateLabel(d.date)} (Full)`
          : `${formatDateLabel(d.date)} (${remaining} slot${remaining !== 1 ? "s" : ""} left)`;
        return (
          <option
            key={d._id}
            value={d.date}
            disabled={full}
          >
            {label}
          </option>
        );
      })}
    </select>
  );
}

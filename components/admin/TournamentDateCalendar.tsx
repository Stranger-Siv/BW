"use client";

import { useMemo, useState } from "react";

type TournamentDateCalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tournamentDates?: string[];
};

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDaysInMonth(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  const start = new Date(first);
  start.setDate(start.getDate() - startPad);
  const end = new Date(last);
  end.setDate(end.getDate() + (6 - last.getDay()));

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({
      date: new Date(d),
      isCurrentMonth: d.getMonth() === month,
    });
  }
  return days;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function TournamentDateCalendar({
  selectedDate,
  onSelectDate,
  tournamentDates = [],
}: TournamentDateCalendarProps) {
  const initial = useMemo(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split("-").map(Number);
      return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  const days = useMemo(
    () => getDaysInMonth(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const hasTournament = (dateStr: string) =>
    tournamentDates.includes(dateStr);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="rounded-xl border border-slate-400/40 bg-slate-100/80 p-4 dark:border-slate-600 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Previous month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Next month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1 text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            {day}
          </div>
        ))}
        {days.map(({ date, isCurrentMonth }) => {
          const dateStr = toYYYYMMDD(date);
          const isSelected = selectedDate === dateStr;
          const isTournament = hasTournament(dateStr);
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`flex min-h-[44px] w-full items-center justify-center rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 sm:min-h-0 sm:h-9 ${
                !isCurrentMonth
                  ? "text-slate-400 dark:text-slate-500"
                  : isSelected
                    ? "bg-amber-500 text-slate-900 font-semibold"
                    : isTournament
                      ? "bg-amber-500/20 text-slate-800 hover:bg-amber-500/30 dark:text-slate-200 dark:hover:bg-amber-500/30"
                      : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
              aria-label={`Select ${dateStr}`}
              aria-pressed={isSelected}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {tournamentDates.length > 0 && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Highlighted dates have tournaments scheduled.
        </p>
      )}
    </div>
  );
}

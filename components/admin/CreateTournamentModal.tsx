"use client";

import { useCallback, useEffect, useState } from "react";

export type TournamentFormData = {
  name: string;
  type: string;
  date: string;
  startTime: string;
  registrationDeadline: string;
  maxTeams: string;
  teamSize: string;
  prize: string;
  serverIP: string;
  description: string;
  status: string;
};

const INITIAL_FORM: TournamentFormData = {
  name: "",
  type: "squad",
  date: "",
  startTime: "",
  registrationDeadline: "",
  maxTeams: "",
  teamSize: "4",
  prize: "",
  serverIP: "",
  description: "",
  status: "draft",
};

const TYPE_OPTIONS = [
  { value: "solo", label: "Solo", teamSize: 1 },
  { value: "duo", label: "Duo", teamSize: 2 },
  { value: "squad", label: "Squad", teamSize: 4 },
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration open" },
  { value: "registration_closed", label: "Registration closed" },
] as const;

export type TournamentSubmitPayload = {
  name: string;
  type: string;
  date: string;
  startTime: string;
  registrationDeadline: string;
  maxTeams: number;
  teamSize: number;
  prize?: string;
  serverIP?: string;
  description?: string;
  status: string;
};

type CreateTournamentModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TournamentSubmitPayload) => void;
  loading?: boolean;
  error?: string | null;
  editData?: Partial<TournamentFormData> & { _id: string; type?: string; date?: string; startTime?: string; registrationDeadline?: string; maxTeams?: number | string; teamSize?: number | string } | null;
};

function toDateInput(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function toTimeInput(timeStr: string) {
  if (!timeStr) return "";
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) return timeStr.slice(0, 5);
  return "";
}

function toDateTimeLocal(str: string) {
  if (!str) return "";
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateTournamentModal({
  open,
  onClose,
  onSubmit,
  loading = false,
  error = null,
  editData = null,
}: CreateTournamentModalProps) {
  const [form, setForm] = useState<TournamentFormData>({ ...INITIAL_FORM });

  const isEdit = !!editData?._id;

  useEffect(() => {
    if (!open) {
      setForm({ ...INITIAL_FORM });
      return;
    }
    if (editData?._id) {
      setForm({
        name: editData.name ?? "",
        type: editData.type ?? "squad",
        date: toDateInput(editData.date ?? ""),
        startTime: toTimeInput(editData.startTime ?? ""),
        registrationDeadline: toDateTimeLocal(editData.registrationDeadline ?? ""),
        maxTeams: editData.maxTeams != null ? String(editData.maxTeams) : "",
        teamSize: editData.teamSize != null ? String(editData.teamSize) : "4",
        prize: editData.prize ?? "",
        serverIP: editData.serverIP ?? "",
        description: editData.description ?? "",
        status: editData.status ?? "draft",
      });
    } else {
      setForm({ ...INITIAL_FORM });
    }
  }, [open, editData]);

  const update = useCallback((field: keyof TournamentFormData, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "type") {
        const opt = TYPE_OPTIONS.find((o) => o.value === value);
        if (opt) next.teamSize = String(opt.teamSize);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const maxTeams = parseInt(form.maxTeams, 10);
      const teamSize = parseInt(form.teamSize, 10);
      if (!form.name.trim()) return;
      if (!form.date.trim()) return;
      if (!form.startTime.trim()) return;
      if (!form.registrationDeadline.trim()) return;
      if (!Number.isFinite(maxTeams) || maxTeams < 1) return;
      if (!Number.isFinite(teamSize) || teamSize < 1) return;
      const payload: TournamentSubmitPayload = {
        name: form.name.trim(),
        type: form.type || "squad",
        date: form.date.trim(),
        startTime: form.startTime.trim(),
        registrationDeadline: form.registrationDeadline.trim(),
        maxTeams,
        teamSize,
        prize: form.prize.trim() || undefined,
        serverIP: form.serverIP.trim() || undefined,
        description: form.description.trim() || undefined,
        status: form.status,
      };
      onSubmit(payload);
    },
    [form, onSubmit]
  );

  if (!open) return null;

  const inputClass =
    "input-glass w-full rounded-xl px-4 py-2.5";
  const labelClass = "mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-tournament-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div className="card-glass relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl p-5 shadow-xl sm:max-w-lg sm:max-h-[85vh] sm:rounded-2xl sm:p-6">
        <h2 id="create-tournament-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {isEdit ? "Edit tournament" : "Create tournament"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Tournament name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass}
              required
              placeholder="e.g. Spring Cup 2026"
            />
          </div>

          <div>
            <label className={labelClass}>Type *</label>
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className={inputClass}
              required
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({o.teamSize} player{o.teamSize !== 1 ? "s" : ""})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Start time *</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Registration deadline (date + time) *</label>
            <input
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={(e) => update("registrationDeadline", e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Max teams *</label>
              <input
                type="number"
                min={1}
                value={form.maxTeams}
                onChange={(e) => update("maxTeams", e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Team size *</label>
              <input
                type="number"
                min={1}
                value={form.teamSize}
                onChange={(e) => update("teamSize", e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className={labelClass}>Prize</label>
            <textarea
              value={form.prize}
              onChange={(e) => update("prize", e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Optional prize info"
            />
          </div>

          <div>
            <label className={labelClass}>Server IP</label>
            <input
              type="text"
              value={form.serverIP}
              onChange={(e) => update("serverIP", e.target.value)}
              className={inputClass}
              placeholder="e.g. play.example.com"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 dark:text-red-300">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-white/15 dark:text-slate-200 dark:hover:bg-white/15 sm:py-2 sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient rounded-xl px-4 py-3 text-base sm:py-2 sm:text-sm"
            >
              {loading ? "Saving…" : isEdit ? "Save changes" : "Create tournament"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

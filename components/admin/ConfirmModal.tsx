"use client";

import { useEffect, useState } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  /** Optional: require typing a specific phrase before enabling confirm */
  requireTextLabel?: string;
  requireTextValue?: string;
  requireTextPlaceholder?: string;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
  requireTextLabel,
  requireTextValue,
  requireTextPlaceholder,
}: ConfirmModalProps) {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!open) {
      setConfirmText("");
    }
  }, [open]);

  if (!open) return null;

  const isDanger = variant === "danger";
  const needsText =
    typeof requireTextValue === "string" && requireTextValue.trim().length > 0;
  const hasMatch =
    !needsText ||
    confirmText.trim().toLowerCase() === requireTextValue!.trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
        aria-hidden
      />
      <div className="card-glass relative w-full max-w-[calc(100%-2rem)] rounded-t-2xl p-5 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <h2
          id="confirm-modal-title"
          className="text-lg font-semibold text-slate-800 dark:text-slate-100"
        >
          {title}
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">
          {message}
        </p>
        {needsText && (
          <div className="mt-4 space-y-2">
            {requireTextLabel && (
              <p className="text-xs text-amber-400 dark:text-amber-300">
                {requireTextLabel}
              </p>
            )}
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requireTextPlaceholder ?? requireTextValue}
              className="w-full rounded-lg border border-amber-400/40 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-amber-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400/60 dark:border-amber-500/40"
            />
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[48px] rounded-full border border-white/10 bg-white/10 px-4 py-3 text-base font-medium text-slate-700 transition hover:bg-white/15 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-white/15 sm:min-h-0 sm:py-2 sm:text-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || (needsText && !hasMatch)}
            className={`min-h-[48px] rounded-full px-4 py-3 text-base font-medium transition disabled:opacity-60 sm:min-h-0 sm:py-2 sm:text-sm ${
              isDanger
                ? "border border-red-400/50 bg-red-500/20 text-red-400 hover:bg-red-500/30 dark:text-red-300"
                : "btn-gradient"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Please wait…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

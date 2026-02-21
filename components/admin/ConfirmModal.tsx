"use client";

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
}: ConfirmModalProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

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
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
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
            disabled={loading}
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

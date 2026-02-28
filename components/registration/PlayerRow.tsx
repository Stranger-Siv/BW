"use client";

type PlayerRowProps = {
  index: number;
  minecraftIGN: string;
  discordUsername: string;
  onIGNChange: (value: string) => void;
  onDiscordChange: (value: string) => void;
  /** Shown under the row when this player (IGN + Discord) is already registered in this tournament */
  error?: string | null;
  /** When true, inputs are read-only (e.g. tournament is scheduled) */
  disabled?: boolean;
};

const inputBase =
  "w-full min-h-[48px] rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-slate-800 placeholder-slate-500 transition-all duration-200 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500 sm:min-h-[44px] sm:py-2.5 sm:text-sm";

export function PlayerRow({
  index,
  minecraftIGN,
  discordUsername,
  onIGNChange,
  onDiscordChange,
  error,
  disabled = false,
}: PlayerRowProps) {
  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${error ? "" : ""}`}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
            Player {index + 1} – Minecraft IGN
          </span>
          <input
            type="text"
            value={minecraftIGN}
            onChange={(e) => onIGNChange(e.target.value)}
            placeholder="e.g. Steve"
            disabled={disabled}
            className={inputBase}
            aria-label={`Player ${index + 1} Minecraft IGN`}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-400">
            Player {index + 1} – Discord
          </span>
          <input
            type="text"
            value={discordUsername}
            onChange={(e) => onDiscordChange(e.target.value)}
            placeholder="e.g. username#1234"
            disabled={disabled}
            className={inputBase}
            aria-label={`Player ${index + 1} Discord username`}
          />
        </label>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-400 dark:text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

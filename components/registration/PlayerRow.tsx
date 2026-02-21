"use client";

type PlayerRowProps = {
  index: number;
  minecraftIGN: string;
  discordUsername: string;
  onIGNChange: (value: string) => void;
  onDiscordChange: (value: string) => void;
};

export function PlayerRow({
  index,
  minecraftIGN,
  discordUsername,
  onIGNChange,
  onDiscordChange,
}: PlayerRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
          Player {index + 1} – Minecraft IGN
        </span>
        <input
          type="text"
          value={minecraftIGN}
          onChange={(e) => onIGNChange(e.target.value)}
          placeholder="e.g. Steve"
          className="w-full min-h-[48px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-800 placeholder-slate-500 transition-all duration-200 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500 sm:min-h-0 sm:py-2.5 sm:text-sm"
          aria-label={`Player ${index + 1} Minecraft IGN`}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">
          Player {index + 1} – Discord
        </span>
        <input
          type="text"
          value={discordUsername}
          onChange={(e) => onDiscordChange(e.target.value)}
          placeholder="e.g. username#1234"
          className="w-full min-h-[48px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-800 placeholder-slate-500 transition-all duration-200 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500 sm:min-h-0 sm:py-2.5 sm:text-sm"
          aria-label={`Player ${index + 1} Discord username`}
        />
      </label>
    </div>
  );
}

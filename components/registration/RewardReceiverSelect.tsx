"use client";

type RewardReceiverSelectProps = {
  igns: string[];
  value: string;
  onChange: (ign: string) => void;
  disabled?: boolean;
  id?: string;
};

export function RewardReceiverSelect({
  igns,
  value,
  onChange,
  disabled,
  id = "reward-receiver",
}: RewardReceiverSelectProps) {
  const options = igns.filter((s) => s.trim() !== "");

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full min-h-[48px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-800 transition-all duration-200 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 sm:min-h-0 sm:py-2.5 sm:text-sm"
      aria-label="Reward receiver"
    >
      <option value="">
        {options.length === 0 ? "Enter player IGNs first" : "Select reward receiver"}
      </option>
      {options.map((ign) => (
        <option key={ign} value={ign}>
          {ign}
        </option>
      ))}
    </select>
  );
}

"use client";

import { useEffect, useState } from "react";

type TickerConfig = {
  enabled: boolean;
  items: string[];
};

export function HeroTicker() {
  const [config, setConfig] = useState<TickerConfig | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/home-ticker", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TickerConfig | null) => {
        if (!active || !data) return;
        const items = Array.isArray(data.items)
          ? data.items.map((s) => (s ?? "").toString().trim()).filter(Boolean)
          : [];
        setConfig({ enabled: !!data.enabled && items.length > 0, items });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!config || !config.enabled || config.items.length === 0) return null;

  const loopItems = [...config.items, ...config.items];

  return (
    <div className="mt-4 w-full overflow-hidden rounded-full border border-white/10 bg-black/30/60 px-3 py-1.5 text-[11px] text-slate-200 sm:text-xs">
      <div className="flex items-center gap-3">
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400 sm:inline">
          Updates
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex gap-8 whitespace-nowrap group hover:[animation-play-state:paused]">
            {loopItems.map((item, idx) => (
              <span key={`${item}-${idx}`} className="text-[11px] text-slate-200 sm:text-xs">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


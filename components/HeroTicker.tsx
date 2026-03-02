"use client";

import { useEffect, useState } from "react";

type TickerConfig = {
  enabled: boolean;
  items: string[];
};

type TickerItem = {
  text: string;
  icon?: string;
};

export function HeroTicker() {
  const [config, setConfig] = useState<TickerConfig | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);

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

  useEffect(() => {
    let active = true;
    fetch("/api/stats/players", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { totalPlayers?: number } | null) => {
        if (!active || !data) return;
        const value =
          typeof data.totalPlayers === "number" && Number.isFinite(data.totalPlayers)
            ? data.totalPlayers
            : 0;
        setTotalPlayers(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!config || !config.enabled) return null;

  const items: TickerItem[] = [];

  const hostsFromConfig = Array.isArray(config.items)
    ? config.items.map((s) => (s ?? "").toString().trim()).filter(Boolean)
    : [];
  if (hostsFromConfig.length) {
    for (const name of hostsFromConfig) {
      items.push({ icon: "🔥", text: name });
    }
  }

  if (totalPlayers && totalPlayers > 0) {
    items.push({
      icon: "👥",
      text: `${totalPlayers} registered players`,
    });
  }

  if (items.length === 0) return null;

  // Repeat more than 2x so small screens don't show "empty gaps" between loops.
  // We keep an even multiple so the -50% animation remains seamless.
  const loopItems = [...items, ...items, ...items, ...items];

  return (
    <div className="mt-4 w-full max-w-xl mx-auto overflow-hidden px-2 sm:px-0 sm:max-w-2xl">
      <div className="relative flex items-center gap-3 text-[11px] text-slate-200 sm:text-xs">
        <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-900">
          Host
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex w-max gap-8 whitespace-nowrap group hover:[animation-play-state:paused]">
            {loopItems.map((item, idx) => (
              <span key={`${item.text}-${idx}`} className="inline-flex items-center gap-1">
                {item.icon && <span className="text-amber-400">{item.icon}</span>}
                <span>{item.text}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


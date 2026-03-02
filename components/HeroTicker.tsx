"use client";

import { useEffect, useState } from "react";

type TickerConfig = {
  enabled: boolean;
  items: string[];
};

export function HeroTicker() {
  const [config, setConfig] = useState<TickerConfig | null>(null);
  const [hostNames, setHostNames] = useState<string[]>([]);

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
    fetch("/api/settings/site", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { hostedByNames?: string[] } | null) => {
        if (!active || !data) return;
        const list = Array.isArray(data.hostedByNames) ? data.hostedByNames : [];
        const cleaned = list
          .map((s) => (s ?? "").toString().trim())
          .filter((s) => !!s);
        if (cleaned.length) setHostNames(cleaned);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!config || !config.enabled) return null;

  const baseItems = Array.isArray(config.items)
    ? config.items.map((s) => (s ?? "").toString().trim()).filter(Boolean)
    : [];

  const hostLabel = hostNames.length ? hostNames.join(", ") : "";
  const itemsWithHost = hostLabel ? [`🔥 Hosted by ${hostLabel}`, ...baseItems] : baseItems;
  if (itemsWithHost.length === 0) return null;

  const loopItems = [...itemsWithHost, ...itemsWithHost];

  return (
    <div className="mt-4 w-full overflow-hidden">
      <div className="relative flex items-center gap-3 text-[11px] text-slate-200 sm:text-xs">
        <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-900">
          Host
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex gap-8 whitespace-nowrap group hover:[animation-play-state:paused]">
            {loopItems.map((item, idx) => (
              <span key={`${item}-${idx}`} className="inline-flex items-center gap-1">
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


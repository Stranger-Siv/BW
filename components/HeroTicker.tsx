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

  const text = config.items[0]?.toString().trim() ?? "";
  if (!text) return null;

  return (
    <div className="mt-4 h-[72px] overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] px-4 py-2">
      <div className="relative flex h-full w-full items-center overflow-hidden">
        <div className="headline-ticker-track flex items-center whitespace-nowrap">
          <span className="pr-16">{text}</span>
          <span className="pr-16" aria-hidden>
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}


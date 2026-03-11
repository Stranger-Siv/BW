"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

type Props = { className?: string };

export function ServerIpChip({ className }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(SITE.serverIp);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-emerald-400 hover:bg-white/20 transition ${className ?? ""}`}
      title={copied ? "Copied!" : "Click to copy server IP"}
    >
      {copied ? "Copied!" : SITE.serverIp}
    </button>
  );
}


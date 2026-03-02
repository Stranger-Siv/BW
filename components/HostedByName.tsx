"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

type Props = {
  className?: string;
};

export function HostedByName({ className }: Props) {
  const [names, setNames] = useState<string[]>([SITE.hostedBy]);

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
        if (cleaned.length) setNames(cleaned);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return <span className={className}>{names.join(", ")}</span>;
}


"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

type Props = {
  className?: string;
};

export function HostedByName({ className }: Props) {
  const [name, setName] = useState<string>(SITE.hostedBy);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/site", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { hostedByName?: string } | null) => {
        if (!active || !data) return;
        const value = (data.hostedByName ?? "").trim();
        if (value) setName(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return <span className={className}>{name}</span>;
}


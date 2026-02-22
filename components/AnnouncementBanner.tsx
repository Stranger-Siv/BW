"use client";

import { useEffect, useState } from "react";
import { usePusherChannel } from "@/components/providers/PusherProvider";

type Announcement = { message: string; active: boolean };

export function AnnouncementBanner() {
  const [ann, setAnn] = useState<Announcement | null>(null);

  useEffect(() => {
    fetch("/api/announcement", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Announcement) => setAnn(data))
      .catch(() => setAnn({ message: "", active: false }));
  }, []);

  usePusherChannel("site", "announcement_changed", (data: unknown) => {
    const payload = data as Announcement;
    if (payload && typeof payload.message === "string" && typeof payload.active === "boolean") {
      setAnn({ message: payload.message, active: payload.active });
    }
  });

  if (!ann?.active || !ann?.message?.trim()) return null;

  return (
    <div className="border-b border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-center text-sm text-emerald-100">
      {ann.message}
    </div>
  );
}

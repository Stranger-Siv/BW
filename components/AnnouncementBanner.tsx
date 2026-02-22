"use client";

import { useEffect, useState } from "react";

type Announcement = { message: string; active: boolean };

export function AnnouncementBanner() {
  const [ann, setAnn] = useState<Announcement | null>(null);

  useEffect(() => {
    fetch("/api/announcement", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Announcement) => setAnn(data))
      .catch(() => setAnn({ message: "", active: false }));
  }, []);

  if (!ann?.active || !ann?.message?.trim()) return null;

  return (
    <div className="border-b border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-center text-sm text-emerald-100">
      {ann.message}
    </div>
  );
}

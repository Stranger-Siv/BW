"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { ImpersonationBanner } from "./ImpersonationBanner";

type Maintenance = { maintenanceMode: boolean };

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);

  useEffect(() => {
    fetch("/api/settings/maintenance", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Maintenance) => setMaintenance(data))
      .catch(() => setMaintenance({ maintenanceMode: false }));
  }, []);

  const isSuperAdmin = (session?.user as { role?: string })?.role === "super_admin";
  const showMaintenance = maintenance?.maintenanceMode === true && status === "authenticated" && !isSuperAdmin;

  if (showMaintenance) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="card-glass max-w-md rounded-2xl border-amber-400/30 bg-amber-500/10 p-8 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
          <h1 className="text-xl font-bold text-amber-200 sm:text-2xl">Under maintenance</h1>
          <p className="mt-3 text-sm text-slate-300">
            We’re making improvements. Please check back shortly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <ImpersonationBanner />
      <AnnouncementBanner />
      {children}
    </>
  );
}

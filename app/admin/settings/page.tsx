"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { usePusherChannel } from "@/components/providers/PusherProvider";

type SettingsState = {
  maintenanceMode: boolean;
  announcement: { message: string; active: boolean };
};

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";
  const [settings, setSettings] = useState<SettingsState>({
    maintenanceMode: false,
    announcement: { message: "", active: false },
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState<"on" | "off" | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/settings", { cache: "no-store" });
      if (res.status === 403) {
        setMessage("Only super admins can manage settings.");
        setMessageType("error");
        return;
      }
      if (!res.ok) {
        setMessage("Failed to load settings");
        setMessageType("error");
        return;
      }
      const data = await res.json();
      setSettings({
        maintenanceMode: Boolean(data.maintenanceMode),
        announcement: {
          message: data.announcement?.message ?? "",
          active: Boolean(data.announcement?.active),
        },
      });
      setMessage(null);
      setMessageType(null);
    } catch {
      setMessage("Failed to load settings");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" || !isSuperAdmin) return;
    fetchSettings();
  }, [status, isSuperAdmin, fetchSettings]);

  usePusherChannel(isSuperAdmin ? "site" : null, "maintenance_changed", (data: unknown) => {
    const payload = data as { maintenanceMode?: boolean };
    const mode = payload?.maintenanceMode;
    if (typeof mode === "boolean") {
      setSettings((prev) => ({ ...prev, maintenanceMode: mode }));
    }
  });

  usePusherChannel(isSuperAdmin ? "site" : null, "announcement_changed", (data: unknown) => {
    const payload = data as { message?: string; active?: boolean };
    const message = payload?.message;
    const active = payload?.active;
    if (typeof message === "string" && typeof active === "boolean") {
      setSettings((prev) => ({
        ...prev,
        announcement: { message, active },
      }));
    }
  });

  const onMaintenanceChange = useCallback(
    async (checked: boolean) => {
      setMaintenanceConfirm(null);
      setMaintenanceSaving(true);
      setMessage(null);
      try {
        const res = await fetch("/api/super-admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maintenanceMode: checked }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessage(data.error ?? "Failed to update maintenance mode");
          setMessageType("error");
          return;
        }
        setSettings((prev) => ({ ...prev, maintenanceMode: checked }));
        setMessage("Maintenance mode saved.");
        setMessageType("success");
        setTimeout(() => { setMessage(null); setMessageType(null); }, 3000);
      } catch {
        setMessage("Failed to update maintenance mode");
        setMessageType("error");
      } finally {
        setMaintenanceSaving(false);
      }
    },
    []
  );

  const onAnnouncementSave = useCallback(async () => {
    setAnnouncementSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/super-admin/announcement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: settings.announcement.message,
          active: settings.announcement.active,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Failed to update announcement");
        setMessageType("error");
        return;
      }
      setMessage("Announcement saved.");
      setMessageType("success");
      setTimeout(() => { setMessage(null); setMessageType(null); }, 3000);
    } catch {
      setMessage("Failed to update announcement");
      setMessageType("error");
    } finally {
      setAnnouncementSaving(false);
    }
  }, [settings.announcement.message, settings.announcement.active]);

  if (status === "loading" || (isSuperAdmin && loading)) {
    return (
      <main className="loading-wrap">
        <div className="loading-spinner border-amber-500" aria-hidden />
        <p className="loading-text">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-inner-wide max-w-2xl">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Link href="/admin" className="back-link text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300">
            ← Admin
          </Link>
          <span className="text-slate-500 dark:text-slate-400">/</span>
          <span className="text-slate-600 dark:text-slate-300">Settings</span>
        </nav>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Global site settings
        </h1>
        <p className="mb-6 text-slate-600 dark:text-slate-400">
          Maintenance mode and site-wide announcement. Only super admins can change these.
        </p>

        {!isSuperAdmin && (
          <div className="card-glass rounded-xl border-amber-400/30 bg-amber-500/10 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-amber-200">You need super admin access to manage settings.</p>
            <Link href="/admin" className="mt-3 inline-block text-sm font-medium text-amber-400 hover:text-amber-300">
              ← Back to Admin
            </Link>
          </div>
        )}

        {isSuperAdmin && (
          <>
            {message && (
              <div
                className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                  messageType === "error"
                    ? "border border-red-400/30 bg-red-500/10 text-red-200 dark:border-red-500/30 dark:bg-red-500/10"
                    : "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                }`}
              >
                {message}
              </div>
            )}

            <section className="card-glass mb-6 rounded-xl border border-slate-600/40 bg-slate-800/40 p-6 dark:border-slate-500/30 dark:bg-slate-800/60">
              <h2 className="mb-3 text-lg font-semibold text-slate-200 dark:text-slate-200">Maintenance mode</h2>
              <p className="mb-4 text-sm text-slate-400">
                When on, only super admins can use the site. Others see an &quot;Under maintenance&quot; page.
              </p>
              <p className="mb-3 text-sm font-medium text-slate-300">
                Status: <span className={settings.maintenanceMode ? "text-amber-400" : "text-emerald-400"}>
                  {settings.maintenanceMode ? "On" : "Off"}
                </span>
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setMaintenanceConfirm("on")}
                  disabled={maintenanceSaving || settings.maintenanceMode}
                  className="rounded-full border border-amber-400/50 bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/30 disabled:opacity-50 disabled:hover:bg-amber-500/20"
                >
                  Turn on
                </button>
                <button
                  type="button"
                  onClick={() => setMaintenanceConfirm("off")}
                  disabled={maintenanceSaving || !settings.maintenanceMode}
                  className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50 disabled:hover:bg-emerald-500/20"
                >
                  Turn off
                </button>
              </div>
              {maintenanceSaving && (
                <p className="mt-2 text-xs text-slate-500">Saving…</p>
              )}
            </section>

            <ConfirmModal
              open={maintenanceConfirm === "on"}
              title="Turn on maintenance mode?"
              message="Only super admins will be able to use the site. Everyone else will see the maintenance page."
              confirmLabel="Turn on"
              variant="danger"
              loading={maintenanceSaving}
              onConfirm={() => onMaintenanceChange(true)}
              onCancel={() => setMaintenanceConfirm(null)}
            />
            <ConfirmModal
              open={maintenanceConfirm === "off"}
              title="Turn off maintenance mode?"
              message="The site will be available to everyone again."
              confirmLabel="Turn off"
              variant="neutral"
              loading={maintenanceSaving}
              onConfirm={() => onMaintenanceChange(false)}
              onCancel={() => setMaintenanceConfirm(null)}
            />

            <section className="card-glass rounded-xl border border-slate-600/40 bg-slate-800/40 p-6 dark:border-slate-500/30 dark:bg-slate-800/60">
              <h2 className="mb-3 text-lg font-semibold text-slate-200 dark:text-slate-200">Announcement</h2>
              <p className="mb-4 text-sm text-slate-400">
                Show a site-wide banner. Leave message empty and inactive to hide it.
              </p>
              <textarea
                value={settings.announcement.message}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    announcement: { ...prev.announcement, message: e.target.value },
                  }))
                }
                placeholder="Announcement message…"
                rows={3}
                className="mb-4 w-full rounded-lg border border-slate-500/50 bg-slate-700/50 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <label className="mb-4 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.announcement.active}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      announcement: { ...prev.announcement, active: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-slate-200">Show announcement</span>
              </label>
              <button
                type="button"
                onClick={onAnnouncementSave}
                disabled={announcementSaving}
                className="rounded-full bg-amber-500/80 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-500 disabled:opacity-60"
              >
                {announcementSaving ? "Saving…" : "Save announcement"}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

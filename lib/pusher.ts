/**
 * Server-side Pusher client for broadcasting real-time events.
 * Returns null if Pusher env vars are not set (real-time disabled).
 */
import Pusher from "pusher";

let serverPusher: Pusher | null = null;

function getPusherConfig() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "us2";
  if (!appId || !key || !secret) return null;
  return { appId, key, secret, cluster };
}

export function getServerPusher(): Pusher | null {
  if (serverPusher) return serverPusher;
  const config = getPusherConfig();
  if (!config) return null;
  serverPusher = new Pusher({
    appId: config.appId,
    key: config.key,
    secret: config.secret,
    cluster: config.cluster,
    useTLS: true,
  });
  return serverPusher;
}

/** Channel names used across the app */
export const PUSHER_CHANNELS = {
  SITE: "site",
} as const;

/** Event names for site channel */
export const PUSHER_EVENTS = {
  MAINTENANCE_CHANGED: "maintenance_changed",
  ANNOUNCEMENT_CHANGED: "announcement_changed",
} as const;

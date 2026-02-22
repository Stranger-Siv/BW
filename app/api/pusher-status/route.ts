import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Debug: check if Pusher is configured on the server.
 * Open /api/pusher-status in browser or use curl.
 * Remove or restrict in production if you don't want to expose this.
 */
export async function GET() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  const serverConfigured = Boolean(
    appId?.trim() && key?.trim() && secret?.trim() && cluster?.trim()
  );

  const clientKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const clientCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  const clientConfigured = Boolean(clientKey?.trim() && clientCluster?.trim());

  const messages: string[] = [];
  if (!serverConfigured) {
    messages.push("Server: Missing PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, or PUSHER_CLUSTER.");
  } else {
    messages.push("Server: Pusher env vars are set (server can trigger events).");
  }
  if (!clientConfigured) {
    messages.push("Client: NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER not set at build time. Add them in your host's env, then rebuild and redeploy.");
  } else {
    messages.push("Client: NEXT_PUBLIC_ vars were set at build time.");
  }

  return NextResponse.json({
    serverConfigured,
    clientConfigured,
    cluster: cluster ?? "(not set)",
    message: messages.join(" "),
  });
}

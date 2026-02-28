/**
 * Discord webhook notifications. Webhooks only (no bot).
 * Set DISCORD_WEBHOOK_TOURNAMENTS and/or DISCORD_WEBHOOK_REGISTRATIONS.
 * Optional: DISCORD_EMBED_FOOTER to override the footer text.
 */

const DIVIDER = "_________";

export type DiscordEmbed = {
  type?: "rich";
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  thumbnail?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[] | null;
  footer?: { text: string };
  timestamp?: string;
};

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "";
  if (!u) return "";
  return u.startsWith("http") ? u : `https://${u}`;
}

function buildBody(embed: DiscordEmbed): string {
  return JSON.stringify({ content: null, embeds: [embed], components: [] });
}

const EMBED_FOOTER =
  process.env.DISCORD_EMBED_FOOTER ||
  "🏆 BEDWARS MCF ELITE • Break Beds • Win Games • Repeat";

const COLOR_ORANGE = 16753920;
const COLOR_GREEN = 0x2ecc71;
const COLOR_AMBER = 0xf1c40f;

function getThumbnailUrl(baseUrl: string): string | undefined {
  const logo = process.env.DISCORD_EMBED_LOGO_URL || (baseUrl ? `${baseUrl}/baba-tillu-logo.png` : "");
  return logo || undefined;
}

/**
 * Sends a single embed to the given webhook URL. Does not throw; logs errors.
 */
export async function sendDiscordWebhook(
  webhookUrl: string | undefined,
  embed: DiscordEmbed
): Promise<void> {
  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) return;
  try {
    new URL(webhookUrl);
  } catch {
    return;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildBody(embed),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        console.warn("Discord webhook 401: Invalid Webhook Token. Re-copy the webhook URL.");
      } else {
        console.warn("Discord webhook failed:", res.status, text);
      }
    }
  } catch (err) {
    console.warn("Discord webhook error:", err);
  }
}

const TOURNAMENTS_WEBHOOK = process.env.DISCORD_WEBHOOK_TOURNAMENTS;
const REGISTRATIONS_WEBHOOK = process.env.DISCORD_WEBHOOK_REGISTRATIONS;

/**
 * Notify #tournaments: new tournament created.
 */
export async function notifyNewTournament(data: {
  tournamentId: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  registrationDeadline: string;
  maxTeams: number;
  status: string;
}): Promise<void> {
  const base = getBaseUrl();
  const tournamentLink = base ? `${base}/tournaments/${data.tournamentId}` : undefined;
  const lines = [
    "🔥 **A new tournament has been created.**",
    "**Strategy meets domination — time to compete.** 🔥",
    "",
    "> 📅 **Date:** " + data.date + " • ⏰ **Start:** " + data.startTime,
    "> 📋 **Mode:** " + data.type + " • 👥 **Slots:** 0 / " + data.maxTeams,
    "> 📝 **Registration until:** " + data.registrationDeadline,
    "> 📌 **Status:** " + data.status,
    "",
    DIVIDER,
    "",
    "✨ **Register now:**",
    "> ⚔️ Team up, grind hard, and dominate every match.",
    tournamentLink ? "> 🔗 " + tournamentLink : "",
    "",
    DIVIDER,
    "",
    "⚔️ Defend your bed.",
    "⛏️ Break theirs.",
    "👑 Become unstoppable.",
    "",
    "✨ The arena is open. Welcome to **" + data.name + "**. ✨",
  ].filter(Boolean);
  const thumb = getThumbnailUrl(base);
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    type: "rich",
    title: `⭐ >> • NEW TOURNAMENT • ⭐`,
    description: lines.join("\n"),
    url: tournamentLink || undefined,
    color: COLOR_ORANGE,
    thumbnail: thumb ? { url: thumb } : undefined,
    fields: null,
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
  });
}

const FIELD_VALUE_MAX = 1024;
const TITLE_MAX = 256;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

/**
 * Notify #registrations: new team registered.
 */
export async function notifyNewRegistration(data: {
  tournamentId: string;
  tournamentName: string;
  teamName: string;
  playerIGNs: string[];
  slot: string;
}): Promise<void> {
  if (!REGISTRATIONS_WEBHOOK || !REGISTRATIONS_WEBHOOK.startsWith("https://discord.com/api/webhooks/")) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Discord registrations skipped: set DISCORD_WEBHOOK_REGISTRATIONS.");
    }
    return;
  }
  const base = getBaseUrl();
  const tournamentLink = base ? `${base}/tournaments/${data.tournamentId}` : undefined;
  const playersStr = data.playerIGNs.join(", ") || "—";
  const teamName = truncate(data.teamName, FIELD_VALUE_MAX);
  const lines = [
    "🧋 **A new team has joined the arena!** 🧐",
    "",
    "> 👥 **Team:** " + teamName,
    "> 🎮 **Players:** " + truncate(playersStr, FIELD_VALUE_MAX),
    "> 📌 **Slot:** " + data.slot,
    "> 🏆 **Tournament:** " + data.tournamentName,
    "",
    DIVIDER,
    "",
    "✨ **View tournament:**",
    tournamentLink ? "> 🔗 " + tournamentLink : "",
    "",
    DIVIDER,
    "",
    "⚔️ Another warrior enters. No mercy, only victories. 👑",
    "✨ The squad grows stronger. ✨",
  ].filter(Boolean);
  const thumb = getThumbnailUrl(base);
  await sendDiscordWebhook(REGISTRATIONS_WEBHOOK, {
    type: "rich",
    title: `⭐ >> • NEW REGISTRATION • ⭐`,
    description: lines.join("\n"),
    url: tournamentLink || undefined,
    color: COLOR_GREEN,
    thumbnail: thumb ? { url: thumb } : undefined,
    fields: null,
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify #tournaments: registration closed (full or manually closed).
 */
export async function notifyRegistrationClosed(data: {
  tournamentId: string;
  tournamentName: string;
  slotText: string;
}): Promise<void> {
  const base = getBaseUrl();
  const tournamentLink = base ? `${base}/tournaments/${data.tournamentId}` : undefined;
  const lines = [
    "🔒 **Registration is now closed.**",
    "",
    "> " + data.slotText,
    "> **Tournament:** " + data.tournamentName,
    "",
    DIVIDER,
    "",
    "📢 **Bracket and matches coming next.**",
    tournamentLink ? "> 🔗 " + tournamentLink : "",
    "",
    DIVIDER,
    "",
    "⚔️ Slots filled. The battlefield is set. 👑",
    "✨ Stay ready for the bracket. ✨",
  ].filter(Boolean);
  const thumb = getThumbnailUrl(base);
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    type: "rich",
    title: `⭐ >> • REGISTRATION CLOSED • ⭐`,
    description: lines.join("\n"),
    url: tournamentLink || undefined,
    color: COLOR_AMBER,
    thumbnail: thumb ? { url: thumb } : undefined,
    fields: null,
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify #tournaments: bracket is live (rounds created).
 */
export async function notifyBracketLive(data: {
  tournamentId: string;
  tournamentName: string;
}): Promise<void> {
  const base = getBaseUrl();
  const roundsLink = base ? `${base}/tournaments/${data.tournamentId}/rounds` : undefined;
  const lines = [
    "📢 **Rounds have been published.**",
    "**The bracket is live — time to see who dominates.** 🎨",
    "",
    "> 📋 **Tournament:** " + data.tournamentName,
    "> 🏆 **Bracket:** Ready to view",
    "",
    DIVIDER,
    "",
    "✨ **View bracket:**",
    roundsLink ? "> 🔗 " + roundsLink : "",
    "",
    DIVIDER,
    "",
    "⚔️ Defend your bed.",
    "⛏️ Break theirs.",
    "👑 Become unstoppable.",
    "",
    "✨ The grind begins now. **Bracket is live.** ✨",
    "⚔️ Undefeated. Unmatched. Unstoppable. 👑",
  ].filter(Boolean);
  const thumb = getThumbnailUrl(base);
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    type: "rich",
    title: `⭐ >> • BRACKET LIVE • ⭐`,
    description: lines.join("\n"),
    url: roundsLink || undefined,
    color: COLOR_GREEN,
    thumbnail: thumb ? { url: thumb } : undefined,
    fields: null,
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
  });
}

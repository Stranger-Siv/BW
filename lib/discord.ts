/**
 * Discord webhook helpers. Sends embeds; never throws (logs and returns).
 * Set DISCORD_WEBHOOK_TOURNAMENTS and/or DISCORD_WEBHOOK_REGISTRATIONS in env.
 * Optional: DISCORD_EMBED_LOGO_URL for thumbnail (absolute URL to your logo).
 */

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  author?: { name: string; url?: string; icon_url?: string };
  thumbnail?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
};

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "";
  if (!u) return "";
  return u.startsWith("http") ? u : `https://${u}`;
}

const SITE_NAME = "BedWars Tournament";

function buildBody(embed: DiscordEmbed): string {
  return JSON.stringify({ embeds: [embed] });
}

/** Build common embed decoration: author (links to site), optional thumbnail, footer with site. */
function embedDecoration(baseUrl: string): Pick<DiscordEmbed, "author" | "thumbnail" | "footer"> {
  const logoUrl = process.env.DISCORD_EMBED_LOGO_URL || (baseUrl ? `${baseUrl}/baba-tillu-logo.png` : "");
  let footerText = SITE_NAME;
  if (baseUrl) {
    try {
      footerText = `${new URL(baseUrl).hostname} • Click title for link`;
    } catch {
      footerText = "BedWars Tournament • Click title for link";
    }
  }
  return {
    author: {
      name: SITE_NAME,
      url: baseUrl || undefined,
    },
    ...(logoUrl ? { thumbnail: { url: logoUrl } } : {}),
    footer: { text: footerText },
  };
}

/**
 * Sends a single embed to the given webhook URL. Does not throw; logs errors.
 */
export async function sendDiscordWebhook(
  webhookUrl: string | undefined,
  embed: DiscordEmbed
): Promise<void> {
  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Discord webhook skipped: URL not set or invalid. Add DISCORD_WEBHOOK_TOURNAMENTS / DISCORD_WEBHOOK_REGISTRATIONS in your deployment env.");
    }
    return;
  }
  try {
    new URL(webhookUrl);
  } catch {
    console.warn("Discord webhook skipped: invalid URL format.");
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
        console.warn("Discord webhook 401: Invalid Webhook Token. In Discord, create a new webhook or re-copy the full URL (no spaces), then update DISCORD_WEBHOOK_* in your env.");
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

const COLOR_BLUE = 0x3498db;
const COLOR_GREEN = 0x2ecc71;
const COLOR_AMBER = 0xf1c40f;

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
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    ...embedDecoration(base),
    title: `🏆 New Tournament: ${data.name}`,
    description: [
      "A new tournament has been created.",
      tournamentLink ? `\n🔗 **Click the title above** to open the tournament page and register.` : "",
    ].join(""),
    url: tournamentLink,
    color: COLOR_BLUE,
    fields: [
      { name: "📅 Date", value: data.date, inline: true },
      { name: "⏰ Start time", value: data.startTime, inline: true },
      { name: "📋 Mode", value: data.type, inline: true },
      { name: "📝 Registration until", value: data.registrationDeadline, inline: true },
      { name: "👥 Slots", value: `0 / ${data.maxTeams}`, inline: true },
      { name: "📌 Status", value: data.status, inline: true },
    ],
    timestamp: new Date().toISOString(),
  });
}

/** Discord embed field value max length */
const FIELD_VALUE_MAX = 1024;
const TITLE_MAX = 256;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

/**
 * Notify #registrations: new team registered.
 * Requires DISCORD_WEBHOOK_REGISTRATIONS to be set in env (separate from DISCORD_WEBHOOK_TOURNAMENTS).
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
      console.warn("Discord registrations webhook skipped: DISCORD_WEBHOOK_REGISTRATIONS not set or invalid. Add it in your deployment env (e.g. Render → Environment).");
    }
    return;
  }
  const base = getBaseUrl();
  const tournamentLink = base ? `${base}/tournaments/${data.tournamentId}` : undefined;
  const playersStr = data.playerIGNs.join(", ") || "—";
  await sendDiscordWebhook(REGISTRATIONS_WEBHOOK, {
    ...embedDecoration(base),
    title: truncate(`✅ New Registration – ${data.tournamentName}`, TITLE_MAX),
    description: [
      "A new team has registered for the tournament.",
      tournamentLink ? `\n🔗 **Click the title above** to view the tournament page.` : "",
    ].join(""),
    url: tournamentLink,
    color: COLOR_GREEN,
    fields: [
      { name: "👥 Team", value: truncate(data.teamName, FIELD_VALUE_MAX), inline: false },
      { name: "🎮 Players", value: truncate(playersStr, FIELD_VALUE_MAX), inline: false },
      { name: "📌 Slot", value: data.slot, inline: true },
      ...(tournamentLink ? [{ name: "🔗 Tournament", value: `[Open tournament](${tournamentLink})`, inline: false as const }] : []),
    ],
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
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    ...embedDecoration(base),
    title: `🔒 Registration Closed – ${data.tournamentName}`,
    description: [
      data.slotText,
      tournamentLink ? `\n🔗 **Click the title above** to view the tournament.` : "",
    ].join(""),
    url: tournamentLink,
    color: COLOR_AMBER,
    fields: tournamentLink ? [{ name: "🔗 Tournament", value: `[Open tournament](${tournamentLink})`, inline: false }] : [],
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
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    ...embedDecoration(base),
    title: `📋 Bracket Live – ${data.tournamentName}`,
    description: [
      "Rounds have been published. The bracket is ready to view.",
      roundsLink ? `\n🔗 **Click the title above** to open the bracket.` : "",
    ].join(""),
    url: roundsLink,
    color: COLOR_GREEN,
    fields: roundsLink ? [{ name: "🔗 Bracket", value: `[View bracket](${roundsLink})`, inline: false }] : [],
    timestamp: new Date().toISOString(),
  });
}

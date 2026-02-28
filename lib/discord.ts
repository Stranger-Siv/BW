/**
 * Discord webhook helpers. Sends embeds; never throws (logs and returns).
 * Set DISCORD_WEBHOOK_TOURNAMENTS and/or DISCORD_WEBHOOK_REGISTRATIONS in env.
 */

export type DiscordEmbed = {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "";
  if (!u) return "";
  return u.startsWith("http") ? u : `https://${u}`;
}

function buildBody(embed: DiscordEmbed): string {
  return JSON.stringify({ embeds: [embed] });
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
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildBody(embed),
    });
    if (!res.ok) {
      console.warn("Discord webhook failed:", res.status, await res.text());
    }
  } catch (err) {
    console.warn("Discord webhook error:", err);
  }
}

const TOURNAMENTS_WEBHOOK = process.env.DISCORD_WEBHOOK_TOURNAMENTS;
const REGISTRATIONS_WEBHOOK = process.env.DISCORD_WEBHOOK_REGISTRATIONS;

const FOOTER = { text: "BedWars Tournament" };
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
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    title: `New tournament: ${data.name}`,
    url: base ? `${base}/tournaments/${data.tournamentId}` : undefined,
    color: COLOR_BLUE,
    fields: [
      { name: "Mode", value: data.type, inline: true },
      { name: "Date", value: data.date, inline: true },
      { name: "Start", value: data.startTime, inline: true },
      { name: "Registration until", value: data.registrationDeadline, inline: true },
      { name: "Slots", value: `0 / ${data.maxTeams}`, inline: true },
      { name: "Status", value: data.status, inline: true },
    ],
    footer: FOOTER,
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
  const playersStr = data.playerIGNs.join(", ") || "—";
  await sendDiscordWebhook(REGISTRATIONS_WEBHOOK, {
    title: truncate(`New registration – ${data.tournamentName}`, TITLE_MAX),
    url: base ? `${base}/tournaments/${data.tournamentId}` : undefined,
    color: COLOR_GREEN,
    fields: [
      { name: "Team", value: truncate(data.teamName, FIELD_VALUE_MAX), inline: false },
      { name: "Players", value: truncate(playersStr, FIELD_VALUE_MAX), inline: false },
      { name: "Slot", value: data.slot, inline: true },
    ],
    footer: FOOTER,
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
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    title: `Registration closed – ${data.tournamentName}`,
    description: data.slotText,
    url: base ? `${base}/tournaments/${data.tournamentId}` : undefined,
    color: COLOR_AMBER,
    footer: FOOTER,
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
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    title: `Bracket is live – ${data.tournamentName}`,
    description: "Rounds have been published. Check the bracket below.",
    url: base ? `${base}/tournaments/${data.tournamentId}/rounds` : undefined,
    color: COLOR_GREEN,
    footer: FOOTER,
    timestamp: new Date().toISOString(),
  });
}

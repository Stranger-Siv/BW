/**
 * Discord webhook notifications. Embeds only. No plain messages.
 * Set DISCORD_WEBHOOK_TOURNAMENTS and/or DISCORD_WEBHOOK_REGISTRATIONS.
 * Optional: DISCORD_EMBED_FOOTER to override the footer text.
 *
 * Custom emojis (<a:name:id>) only render in embed description/fields, not in
 * title or footer. So titles are plain text; animated emojis are used in the body.
 */

// ─── Animated emojis (same server as webhook required for these to render) ─────
// Use exact names as in Discord (with ~1/~6 if shown). Update IDs if one doesn’t render.
const E = {
  Stars: "<a:Gf_Stars~1:1426788119163961364>",
  Cute: "<a:Baba_Cute:1428611435122000023>",
  Arrow: "<a:Arrow~6:1426787645115076758>",
  Fire: "<a:Fire_yellow~1:1428616881727864832>",
  Rules: "<a:Rules~1:1428412802577727642>",
  Updates: "<a:Baba_oh_updates~1:1428410120051626134>",
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

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

/** Discord link button (style 5). Max 5 per row, max 5 rows. */
type DiscordLinkButton = { type: 2; style: 5; label: string; url: string };
type DiscordActionRow = { type: 1; components: DiscordLinkButton[] };

// ─── Config & constants ──────────────────────────────────────────────────────

const EMBED_FOOTER =
  process.env.DISCORD_EMBED_FOOTER ||
  "🏆 BEDWARS MCF ELITE • Break Beds • Win Games • Repeat";

const COLOR_ORANGE = 16753920;
const COLOR_GREEN = 0x2ecc71;
const COLOR_AMBER = 0xf1c40f;

const FIELD_VALUE_MAX = 1024;

const TOURNAMENTS_WEBHOOK = process.env.DISCORD_WEBHOOK_TOURNAMENTS;
const REGISTRATIONS_WEBHOOK = process.env.DISCORD_WEBHOOK_REGISTRATIONS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "";
  if (!u) return "";
  return u.startsWith("http") ? u : `https://${u}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

/** Build embed with required footer and timestamp. */
function createEmbed(overrides: Partial<DiscordEmbed>): DiscordEmbed {
  return {
    type: "rich",
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
    fields: null,
    ...overrides,
  };
}

function buildBody(
  embed: DiscordEmbed,
  components?: DiscordActionRow[]
): string {
  return JSON.stringify({
    content: null,
    embeds: [embed],
    components: components && components.length > 0 ? components : [],
  });
}

/** One row of link buttons: "Visit Website" + optional extra buttons (max 5 total). */
function linkButtons(
  websiteUrl: string,
  ...extra: { label: string; url: string }[]
): DiscordActionRow[] {
  const row: DiscordLinkButton[] = [
    { type: 2, style: 5, label: "Visit Website", url: websiteUrl },
  ];
  for (const b of extra) {
    if (b?.url && row.length < 5) {
      row.push({ type: 2, style: 5, label: b.label, url: b.url });
    }
  }
  return [{ type: 1, components: row }];
}

// ─── Webhook send ─────────────────────────────────────────────────────────────

/**
 * Sends a single embed (and optional link buttons) to the given webhook URL.
 * Does not throw; logs errors.
 */
export async function sendDiscordWebhook(
  webhookUrl: string | undefined,
  embed: DiscordEmbed,
  components?: DiscordActionRow[]
): Promise<void> {
  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return;
  }
  try {
    new URL(webhookUrl);
  } catch {
    return;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: buildBody(embed, components),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        console.warn(
          "Discord webhook 401: Invalid Webhook Token. Re-copy the webhook URL."
        );
      } else {
        console.warn("Discord webhook failed:", res.status, text);
      }
    }
  } catch (err) {
    console.warn("Discord webhook error:", err);
  }
}

// ─── Notify: New tournament created ───────────────────────────────────────────

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
  const tournamentLink = base
    ? `${base}/tournaments/${data.tournamentId}`
    : undefined;

  const description = [
    E.Stars + " NEW TOURNAMENT — BEDWARS MCF ELITE " + E.Stars,
    "",
    E.Stars + " A new tournament is now live!",
    "",
    E.Arrow + " Tournament: **" + data.name + "**",
    E.Arrow + " Date: **" + data.date + "** • Start: **" + data.startTime + "**",
    E.Arrow + " Mode: **" + data.type + "**",
    E.Arrow + " Slots: **0 / " + data.maxTeams + "**",
    E.Arrow + " Registration until: **" + data.registrationDeadline + "**",
    E.Arrow + " Status: **" + data.status + "**",
    "",
    "Register now and secure your squad's position.",
    "",
    E.Rules + " No hacks • No toxicity • Play fair",
    E.Updates + " Brackets and announcements coming soon",
    "",
    E.Fire + " Prepare your squad. Dominate the battlefield.",
  ].join("\n");

  const buttons: { label: string; url: string }[] = [];
  if (tournamentLink) buttons.push({ label: "View Tournament", url: tournamentLink });
  const components = base ? linkButtons(base, ...buttons) : undefined;

  const embed = createEmbed({
    title: "NEW TOURNAMENT — BEDWARS MCF ELITE",
    description,
    url: tournamentLink ?? undefined,
    color: COLOR_ORANGE,
  });

  // Use registrations webhook when set so animated emojis render (same server as new team);
  // otherwise fall back to tournaments webhook.
  const webhook = REGISTRATIONS_WEBHOOK || TOURNAMENTS_WEBHOOK;
  await sendDiscordWebhook(webhook, embed, components);
}

// ─── Notify: New team registration ───────────────────────────────────────────

export async function notifyNewRegistration(data: {
  tournamentId: string;
  tournamentName: string;
  teamName: string;
  playerIGNs: string[];
  slot: string;
  teamId?: string;
}): Promise<void> {
  if (
    !REGISTRATIONS_WEBHOOK ||
    !REGISTRATIONS_WEBHOOK.startsWith("https://discord.com/api/webhooks/")
  ) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "Discord registrations skipped: set DISCORD_WEBHOOK_REGISTRATIONS."
      );
    }
    return;
  }

  const base = getBaseUrl();
  const tournamentLink = base
    ? `${base}/tournaments/${data.tournamentId}`
    : undefined;
  const teamDetailLink =
    base && data.teamId
      ? `${base}/tournaments/${data.tournamentId}/teams/${data.teamId}`
      : undefined;

  const playersStr = data.playerIGNs.join(", ") || "—";
  const teamName = truncate(data.teamName, FIELD_VALUE_MAX);
  const playersDisplay = truncate(playersStr, FIELD_VALUE_MAX);

  const description = [
    E.Cute + " NEW TEAM REGISTERED — BEDWARS MCF ELITE " + E.Stars,
    "",
    E.Cute + " A new team has entered the arena!",
    "",
    E.Arrow + " Team: **" + teamName + "**",
    E.Arrow + " Players: **" + playersDisplay + "**",
    E.Arrow + " Slot: **" + data.slot + "**",
    E.Arrow + " Tournament: **" + data.tournamentName + "**",
    "",
    "Teams should now coordinate and prepare strategies.",
    "",
    E.Rules + " Respect teammates • No toxicity • Play smart",
    E.Updates + " Match info and brackets coming soon",
    "",
    E.Fire + " Another challenger joins the fight.",
  ].join("\n");

  const buttons: { label: string; url: string }[] = [];
  if (tournamentLink) buttons.push({ label: "View Tournament", url: tournamentLink });
  if (teamDetailLink) buttons.push({ label: "View Team", url: teamDetailLink });
  const components = base ? linkButtons(base, ...buttons) : undefined;

  const embed = createEmbed({
    title: "NEW TEAM REGISTERED — BEDWARS MCF ELITE",
    description,
    url: tournamentLink ?? undefined,
    color: COLOR_GREEN,
  });

  await sendDiscordWebhook(REGISTRATIONS_WEBHOOK, embed, components);
}

// ─── Notify: Registration closed ───────────────────────────────────────────────

export async function notifyRegistrationClosed(data: {
  tournamentId: string;
  tournamentName: string;
  slotText: string;
}): Promise<void> {
  const base = getBaseUrl();
  const tournamentLink = base
    ? `${base}/tournaments/${data.tournamentId}`
    : undefined;

  const description = [
    E.Stars + " REGISTRATION CLOSED — BEDWARS MCF ELITE " + E.Stars,
    "",
    E.Stars + " Registration has officially closed.",
    "",
    E.Arrow + " " + data.slotText,
    E.Arrow + " Tournament: **" + data.tournamentName + "**",
    "",
    "Teams should now prepare for bracket release.",
    "",
    E.Rules + " Fair play only • No cheats • No toxicity",
    E.Updates + " Bracket announcement coming soon",
    "",
    E.Fire + " The battlefield is set. Prepare for combat.",
  ].join("\n");

  const buttons: { label: string; url: string }[] = [];
  if (tournamentLink) buttons.push({ label: "View Tournament", url: tournamentLink });
  const components = base ? linkButtons(base, ...buttons) : undefined;

  const embed = createEmbed({
    title: "REGISTRATION CLOSED — BEDWARS MCF ELITE",
    description,
    url: tournamentLink ?? undefined,
    color: COLOR_AMBER,
  });

  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, embed, components);
}

// ─── Notify: Bracket live ─────────────────────────────────────────────────────

export async function notifyBracketLive(data: {
  tournamentId: string;
  tournamentName: string;
}): Promise<void> {
  const base = getBaseUrl();
  const roundsLink = base
    ? `${base}/tournaments/${data.tournamentId}/rounds`
    : undefined;

  const description = [
    E.Stars + " BRACKET LIVE — BEDWARS MCF ELITE " + E.Stars,
    "",
    E.Stars + " The bracket is now live!",
    "",
    E.Arrow + " Tournament: **" + data.tournamentName + "**",
    E.Arrow + " Status: **Rounds published**",
    "",
    "Teams should review matchups and prepare strategies.",
    "",
    E.Rules + " No hacks • No toxicity • Play fair",
    E.Updates + " Match announcements will follow",
    "",
    E.Fire + " Defend your bed. Break theirs. Win the war.",
  ].join("\n");

  const buttons: { label: string; url: string }[] = [];
  if (roundsLink) buttons.push({ label: "View Bracket", url: roundsLink });
  const components = base ? linkButtons(base, ...buttons) : undefined;

  const embed = createEmbed({
    title: "BRACKET LIVE — BEDWARS MCF ELITE",
    description,
    url: roundsLink ?? undefined,
    color: COLOR_GREEN,
  });

  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, embed, components);
}

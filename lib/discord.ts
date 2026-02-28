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

/** Discord link button (style 5). Max 5 per row, max 5 rows. */
type DiscordLinkButton = { type: 2; style: 5; label: string; url: string };
type DiscordActionRow = { type: 1; components: DiscordLinkButton[] };

function buildBody(embed: DiscordEmbed, components?: DiscordActionRow[]): string {
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
    { type: 2, style: 5, label: "🌐 Visit Website", url: websiteUrl },
  ];
  for (const b of extra) {
    if (b?.url && row.length < 5) row.push({ type: 2, style: 5, label: b.label, url: b.url });
  }
  return [{ type: 1, components: row }];
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
 * Sends a single embed (and optional link buttons) to the given webhook URL. Does not throw; logs errors.
 */
export async function sendDiscordWebhook(
  webhookUrl: string | undefined,
  embed: DiscordEmbed,
  components?: DiscordActionRow[]
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
      body: buildBody(embed, components),
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
 * Style matches BEDWARS MCF ELITE welcome ( :Gf_Stars: :Arrow: etc. ).
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
    ":Gf_Stars: **Welcome to BEDWARS MCF ELITE** — a new tournament is live! :Gf_Stars:",
    "",
    ":Arrow: **" + data.name + "** — where strategy meets domination :Fire_yellow:",
    ":Arrow: 📅 **Date:** " + data.date + " • ⏰ **Start:** " + data.startTime + " ⚔️",
    "",
    ":Arrow: 🎮 **Mode:** " + data.type + " • 👥 **Slots:** 0 / " + data.maxTeams + " 🏆",
    ":Arrow: 📝 **Registration until:** " + data.registrationDeadline,
    ":Arrow: 📌 **Status:** " + data.status,
    "",
    "🎤 **Register & compete:** Open the link below to join.",
    ":Arrow: Team up, grind hard, and dominate every match. 💬",
    "",
    ":Rules: **Rules & Fair Play:** No hacks. No toxicity. Only skill. :Blue_lightening:",
    ":Arrow: Respect teammates. Play smart.",
    "",
    ":Spider_oh_updates: **Match Updates & Announcements:** Stay ready for brackets & events :rocket_gif:",
    "",
    ":Fire_yellow: Gear up soldier — we conquer MCFleet together ⚔️🔥",
  ].filter(Boolean);
  const components =
    base && tournamentLink
      ? linkButtons(base, { label: "🏆 View Tournament", url: tournamentLink })
      : base
        ? linkButtons(base)
        : undefined;
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    type: "rich",
    title: ":Gf_Stars: 𝐍𝐄𝐖 𝐓𝐎𝐔𝐑𝐍𝐀𝐌𝐄𝐍𝐓 – 𝐁𝐄𝐃𝐖𝐀𝐑𝐒 𝐌𝐂𝐅 𝐄𝐋𝐈𝐓𝐄 :Gf_Stars:",
    description: lines.join("\n"),
    url: tournamentLink || undefined,
    color: COLOR_ORANGE,
    fields: null,
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
  }, components);
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
  teamId?: string;
}): Promise<void> {
  if (!REGISTRATIONS_WEBHOOK || !REGISTRATIONS_WEBHOOK.startsWith("https://discord.com/api/webhooks/")) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Discord registrations skipped: set DISCORD_WEBHOOK_REGISTRATIONS.");
    }
    return;
  }
  const base = getBaseUrl();
  const tournamentLink = base ? `${base}/tournaments/${data.tournamentId}` : undefined;
  const teamDetailLink =
    base && data.teamId
      ? `${base}/tournaments/${data.tournamentId}/teams/${data.teamId}`
      : undefined;
  const playersStr = data.playerIGNs.join(", ") || "—";
  const teamName = truncate(data.teamName, FIELD_VALUE_MAX);
  const lines = [
    ":GF_Cute: **A new team has joined the arena!** :GF_Khush:",
    "",
    ":Arrow: Welcome to **BEDWARS MCF ELITE**, where strategy meets domination :Fire_yellow:",
    ":Arrow: **Team:** " + teamName + " ⚔️",
    "",
    ":Arrow: 🎮 **Players:** " + truncate(playersStr, FIELD_VALUE_MAX),
    ":Arrow: 📌 **Slot:** " + data.slot + " • 🏆 **Tournament:** " + data.tournamentName,
    "",
    "🎤 **Team Chat & Strategy:** Discuss tactics, scrims & game plans 💬 :Basu_chatting:",
    ":Arrow: Open the links below to view the team or tournament.",
    "",
    ":Rules: **Rules & Discipline:** Respect teammates. No toxicity. Play smart. :Blue_lightening:",
    "",
    ":Spider_oh_updates: **Match Updates & Announcements:** Stay ready for brackets & events :rocket_gif:",
    "",
    ":Fire_yellow: Another warrior enters — we conquer MCFleet together ⚔️🔥",
  ].filter(Boolean);
  const extraButtons: { label: string; url: string }[] = [];
  if (tournamentLink) extraButtons.push({ label: "🏆 View Tournament", url: tournamentLink });
  if (teamDetailLink) extraButtons.push({ label: "👥 View Team", url: teamDetailLink });
  const components =
    base ? linkButtons(base, ...extraButtons) : undefined;
  await sendDiscordWebhook(REGISTRATIONS_WEBHOOK, {
    type: "rich",
    title: ":Gf_Stars: 𝐍𝐄𝐖 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐀𝐓𝐈𝐎𝐍 – 𝐁𝐄𝐃𝐖𝐀𝐑𝐒 𝐌𝐂𝐅 𝐄𝐋𝐈𝐓𝐄 :Gf_Stars:",
    description: lines.join("\n"),
    url: tournamentLink || undefined,
    color: COLOR_GREEN,
    fields: null,
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
  }, components);
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
    ":Gf_Stars: **Registration is now closed for BEDWARS MCF ELITE** :Gf_Stars:",
    "",
    ":Arrow: " + data.slotText + " :Fire_yellow:",
    ":Arrow: **Tournament:** " + data.tournamentName + " ⚔️",
    "",
    "🎤 **Team Chat & Strategy:** Brackets and matches coming next. :Basu_chatting:",
    ":Arrow: Stay ready for the bracket — discuss tactics with your squad 💬",
    "",
    ":Rules: **Rules & Discipline:** No hacks. No toxicity. Only skill. :Blue_lightening:",
    "",
    ":Spider_oh_updates: **Match Updates & Announcements:** Bracket will be published soon :rocket_gif:",
    "",
    ":Fire_yellow: Slots filled. The battlefield is set. We conquer MCFleet together ⚔️🔥",
  ].filter(Boolean);
  const components =
    base && tournamentLink
      ? linkButtons(base, { label: "🏆 View Tournament", url: tournamentLink })
      : base
        ? linkButtons(base)
        : undefined;
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    type: "rich",
    title: ":Gf_Stars: 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐀𝐓𝐈𝐎𝐍 𝐂𝐋𝐎𝐒𝐄𝐃 – 𝐁𝐄𝐃𝐖𝐀𝐑𝐒 𝐌𝐂𝐅 𝐄𝐋𝐈𝐓𝐄 :Gf_Stars:",
    description: lines.join("\n"),
    url: tournamentLink || undefined,
    color: COLOR_AMBER,
    fields: null,
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
  }, components);
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
    ":Gf_Stars: **Bracket is live for BEDWARS MCF ELITE** :Gf_Stars:",
    "",
    ":Arrow: **" + data.tournamentName + "** — rounds published, time to dominate :Fire_yellow:",
    ":Arrow: 🏆 **Bracket:** Ready to view ⚔️",
    "",
    "🎤 **Team Chat & Strategy:** Discuss tactics, scrims & game plans 💬 :Basu_chatting:",
    ":Arrow: Open the link below to view the bracket.",
    "",
    ":Rules: **Rules & Discipline:** No hacks. No toxicity. Only skill. :Blue_lightening:",
    "",
    ":Spider_oh_updates: **Match Updates & Announcements:** Stay ready for matches & events :rocket_gif:",
    "",
    ":Fire_yellow: Defend your bed. Break theirs. We conquer MCFleet together ⚔️🔥",
  ].filter(Boolean);
  const components =
    base && roundsLink
      ? linkButtons(base, { label: "📋 View Bracket", url: roundsLink })
      : base
        ? linkButtons(base)
        : undefined;
  await sendDiscordWebhook(TOURNAMENTS_WEBHOOK, {
    type: "rich",
    title: ":Gf_Stars: 𝐁𝐑𝐀𝐂𝐊𝐄𝐓 𝐋𝐈𝐕𝐄 – 𝐁𝐄𝐃𝐖𝐀𝐑𝐒 𝐌𝐂𝐅 𝐄𝐋𝐈𝐓𝐄 :Gf_Stars:",
    description: lines.join("\n"),
    url: roundsLink || undefined,
    color: COLOR_GREEN,
    fields: null,
    footer: { text: EMBED_FOOTER },
    timestamp: new Date().toISOString(),
  }, components);
}

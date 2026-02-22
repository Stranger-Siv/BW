/** Site-wide links and info for BedWars Dominion / MCFleet tournament */

export const SITE = {
  name: "BedWars Tournament",
  serverName: "MCFleet",
  serverIp: "play.mcfleet.net",
  discordUrl: "https://discord.gg/6zyEsX854m",
  /** Discord server invite code or server ID, shown on maintenance page */
  discordId: "6zyEsX854m",
  hostedBy: "Baba Tillu",
  /** Path to Baba Tillu host/sponsor logo (in public/) */
  hostedByLogo: "/baba-tillu-logo.png",
  /** Shown in footer on every page. Set url to make the name a link. */
  developedBy: "DevInBlocks",
  developedByUrl: "" as string, // e.g. "https://github.com/you" or "https://yourportfolio.com"
} as const;

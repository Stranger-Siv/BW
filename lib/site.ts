/** Site-wide links and info for BedWars tournament */

export const SITE = {
  name: "BedWars Tournament",
  serverName: "",
  serverIp: "",
  discordUrl: "https://discord.gg/6zyEsX854m",
  /** Discord server invite code or server ID, shown on maintenance page */
  discordId: "6zyEsX854m",
  hostedBy: "BABA TILLU",
  /** Path to BABA TILLU host/sponsor logo (in public/) */
  hostedByLogo: "/baba-tillu-logo.png",
  /** Shown in footer on every page. Set url to make the name a link. */
  developedBy: "DevInBlocks",
  developedByUrl: "" as string, // e.g. "https://github.com/you" or "https://yourportfolio.com"
} as const;

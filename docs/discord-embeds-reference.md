# Discord embed messages – reference

Emoji placeholders (replace with your server's animated emoji IDs if needed):

| Key | Value |
|-----|--------|
| `E.Gf_Stars` | `<a:Gf_Stars:1426788119163961364>` |
| `E.GF_Cute` | `<a:GF_Cute:1428611435122000023>` |
| `E.GF_Khush` | `<a:GF_Khush:1426788948956414032>` |
| `E.Arrow` | `<a:Arrow:1426787645115076758>` |
| `E.Fire_yellow` | `<a:Fire_yellow:1428616881727864832>` |
| `E.Basu_chatting` | `<a:Basu_chatting:1428620806325276755>` |
| `E.Rules` | `<a:Rules:1428412802577727642>` |
| `E.Blue_lightening` | `<a:Blue_lightening:1212297471238209577>` |
| `E.Spider_oh_updates` | `<a:Spider_oh_updates:1428410120051626134>` |

**Footer (all embeds):** `🏆 BEDWARS MCF ELITE • Break Beds • Win Games • Repeat` (or `DISCORD_EMBED_FOOTER`)

**Colors:** Orange `16753920` · Green `0x2ecc71` · Amber `0xf1c40f`

---

## 1. New tournament created

**When:** A new tournament is created.  
**Webhook:** `DISCORD_WEBHOOK_TOURNAMENTS`  
**Embed color:** Orange (`16753920`)

**Title:**
```
E.Gf_Stars + " 𝐍𝐄𝐖 𝐓𝐎𝐔𝐑𝐍𝐀𝐌𝐄𝐍𝐓 – 𝐁𝐄𝐃𝐖𝐀𝐑𝐒 𝐌𝐂𝐅 𝐄𝐋𝐈𝐓𝐄 " + E.Gf_Stars
```

**Description:**
```
E.Gf_Stars + " **Welcome to BEDWARS MCF ELITE** — a new tournament is live! " + E.Gf_Stars

E.Arrow + " **" + data.name + "** — where strategy meets domination " + E.Fire_yellow
E.Arrow + " 📅 **Date:** " + data.date + " • ⏰ **Start:** " + data.startTime + " ⚔️"

E.Arrow + " 🎮 **Mode:** " + data.type + " • 👥 **Slots:** 0 / " + data.maxTeams + " 🏆"
E.Arrow + " 📝 **Registration until:** " + data.registrationDeadline
E.Arrow + " 📌 **Status:** " + data.status

"🎤 **Register & compete:** Open the link below to join."
E.Arrow + " Team up, grind hard, and dominate every match. 💬"

E.Rules + " **Rules & Fair Play:** No hacks. No toxicity. Only skill. " + E.Blue_lightening
E.Arrow + " Respect teammates. Play smart."

E.Spider_oh_updates + " **Match Updates & Announcements:** Stay ready for brackets & events 🚀"

E.Fire_yellow + " Gear up soldier — we conquer MCFleet together ⚔️🔥"
```

**Data:** `name`, `date`, `startTime`, `type`, `maxTeams`, `registrationDeadline`, `status`  
**Buttons:** 🌐 Visit Website, 🏆 View Tournament (if base URL + tournament ID exist)

---

## 2. New team registration

**When:** A team registers for a tournament.  
**Webhook:** `DISCORD_WEBHOOK_REGISTRATIONS`  
**Embed color:** Green (`0x2ecc71`)

**Title:**
```
E.Gf_Stars + " 𝐍𝐄𝐖 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐀𝐓𝐈𝐎𝐍 – 𝐁𝐄𝐃𝐖𝐀𝐑𝐒 𝐌𝐂𝐅 𝐄𝐋𝐈𝐓𝐄 " + E.Gf_Stars
```

**Description:**
```
E.GF_Cute + " **A new team has joined the arena!** " + E.GF_Khush

E.Arrow + " Welcome to **BEDWARS MCF ELITE**, where strategy meets domination " + E.Fire_yellow
E.Arrow + " **Team:** " + teamName + " ⚔️"

E.Arrow + " 🎮 **Players:** " + playersStr
E.Arrow + " 📌 **Slot:** " + data.slot + " • 🏆 **Tournament:** " + data.tournamentName

"🎤 **Team Chat & Strategy:** Discuss tactics, scrims & game plans 💬 " + E.Basu_chatting
E.Arrow + " Open the links below to view the team or tournament."

E.Rules + " **Rules & Discipline:** Respect teammates. No toxicity. Play smart. " + E.Blue_lightening

E.Spider_oh_updates + " **Match Updates & Announcements:** Stay ready for brackets & events 🚀"

E.Fire_yellow + " Another warrior enters — we conquer MCFleet together ⚔️🔥"
```

**Data:** `teamName`, `playerIGNs` (joined as string), `slot`, `tournamentName`  
**Buttons:** 🌐 Visit Website, 🏆 View Tournament, 👥 View Team (when team ID exists)

---

## 3. Registration closed

**When:** Registration is closed (full or manually).  
**Webhook:** `DISCORD_WEBHOOK_TOURNAMENTS`  
**Embed color:** Amber (`0xf1c40f`)

**Title:**
```
E.Gf_Stars + " 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐀𝐓𝐈𝐎𝐍 𝐂𝐋𝐎𝐒𝐄𝐃 – 𝐁𝐄𝐃𝐖𝐀𝐑𝐒 𝐌𝐂𝐅 𝐄𝐋𝐈𝐓𝐄 " + E.Gf_Stars
```

**Description:**
```
E.Gf_Stars + " **Registration is now closed for BEDWARS MCF ELITE** " + E.Gf_Stars

E.Arrow + " " + data.slotText + " " + E.Fire_yellow
E.Arrow + " **Tournament:** " + data.tournamentName + " ⚔️"

"🎤 **Team Chat & Strategy:** Brackets and matches coming next. " + E.Basu_chatting
E.Arrow + " Stay ready for the bracket — discuss tactics with your squad 💬"

E.Rules + " **Rules & Discipline:** No hacks. No toxicity. Only skill. " + E.Blue_lightening

E.Spider_oh_updates + " **Match Updates & Announcements:** Bracket will be published soon 🚀"

E.Fire_yellow + " Slots filled. The battlefield is set. We conquer MCFleet together ⚔️🔥"
```

**Data:** `slotText`, `tournamentName`  
**Buttons:** 🌐 Visit Website, 🏆 View Tournament (if base URL + tournament ID exist)

---

## 4. Bracket live

**When:** Rounds are created (bracket is published).  
**Webhook:** `DISCORD_WEBHOOK_TOURNAMENTS`  
**Embed color:** Green (`0x2ecc71`)

**Title:**
```
E.Gf_Stars + " 𝐁𝐑𝐀𝐂𝐊𝐄𝐓 𝐋𝐈𝐕𝐄 – 𝐁𝐄𝐃𝐖𝐀𝐑𝐒 𝐌𝐂𝐅 𝐄𝐋𝐈𝐓𝐄 " + E.Gf_Stars
```

**Description:**
```
E.Gf_Stars + " **Bracket is live for BEDWARS MCF ELITE** " + E.Gf_Stars

E.Arrow + " **" + data.tournamentName + "** — rounds published, time to dominate " + E.Fire_yellow
E.Arrow + " 🏆 **Bracket:** Ready to view ⚔️"

"🎤 **Team Chat & Strategy:** Discuss tactics, scrims & game plans 💬 " + E.Basu_chatting
E.Arrow + " Open the link below to view the bracket."

E.Rules + " **Rules & Discipline:** No hacks. No toxicity. Only skill. " + E.Blue_lightening

E.Spider_oh_updates + " **Match Updates & Announcements:** Stay ready for matches & events 🚀"

E.Fire_yellow + " Defend your bed. Break theirs. We conquer MCFleet together ⚔️🔥"
```

**Data:** `tournamentName`  
**Buttons:** 🌐 Visit Website, 📋 View Bracket (when base URL + tournament ID exist)

---

## Raw embed JSON (for testing)

Example payload shape sent to Discord (one embed + optional components):

```json
{
  "content": null,
  "embeds": [{
    "type": "rich",
    "title": "<embed title>",
    "description": "<embed description, newline-separated>",
    "url": "https://...",
    "color": 16753920,
    "fields": null,
    "footer": { "text": "🏆 BEDWARS MCF ELITE • Break Beds • Win Games • Repeat" },
    "timestamp": "2025-02-21T12:00:00.000Z"
  }],
  "components": [{
    "type": 1,
    "components": [
      { "type": 2, "style": 5, "label": "🌐 Visit Website", "url": "https://..." },
      { "type": 2, "style": 5, "label": "🏆 View Tournament", "url": "https://..." }
    ]
  }]
}
```

Implementation: `lib/discord.ts` — `notifyNewTournament`, `notifyNewRegistration`, `notifyRegistrationClosed`, `notifyBracketLive`.

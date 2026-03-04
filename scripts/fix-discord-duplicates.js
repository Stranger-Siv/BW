/**
 * One-time script: find users that share the same discordId and unset discordId
 * on all but one (keeps the earliest-created user). Run from project root:
 *   node scripts/fix-discord-duplicates.js
 * Loads MONGO_URI from .env.local if present.
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Load .env.local into process.env
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("Set MONGO_URI in .env.local or in the environment.");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const users = db.collection("users");

  const withDiscord = await users
    .find({ discordId: { $exists: true, $ne: null, $ne: "" } })
    .project({ _id: 1, discordId: 1, email: 1, createdAt: 1 })
    .toArray();

  const byDiscord = new Map();
  for (const u of withDiscord) {
    const d = (u.discordId || "").trim();
    if (!d) continue;
    if (!byDiscord.has(d)) byDiscord.set(d, []);
    byDiscord.get(d).push(u);
  }

  const duplicates = [];
  for (const [discordId, list] of byDiscord) {
    if (list.length > 1) duplicates.push({ discordId, users: list });
  }

  if (duplicates.length === 0) {
    console.log("No duplicate discordId found.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${duplicates.length} discordId(s) linked to more than one user.`);
  let fixed = 0;
  for (const { discordId, users: list } of duplicates) {
    list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const keep = list[0];
    const remove = list.slice(1);
    console.log(`  Discord ${discordId}: keeping ${keep.email} (${keep._id}), unlinking ${remove.length} other(s).`);
    for (const u of remove) {
      await users.updateOne(
        { _id: u._id },
        { $unset: { discordId: 1, discordUsername: 1 } }
      );
      console.log(`    Unset discordId for ${u.email} (${u._id})`);
      fixed++;
    }
  }
  console.log(`Done. Unlinked ${fixed} user(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

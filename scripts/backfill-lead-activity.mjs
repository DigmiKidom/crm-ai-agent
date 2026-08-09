// Seeds `lastActivityAt` on leads captured before the follow-up engine
// existed. Run ONCE, before the first scheduled run of /api/cron/follow-ups.
//
//   node scripts/backfill-lead-activity.mjs --dry-run
//   node scripts/backfill-lead-activity.mjs
//
// Why this matters:
//
// shouldFlag() falls back to `createdAt` when `lastActivityAt` is missing,
// which is right for a lead that arrived and was never touched. But every
// existing lead is missing it — including ones worked on last week — so the
// first cron run would flag the entire back catalogue at once. The owner
// opens their CRM to a wall of amber badges, concludes the feature is noise,
// and stops looking at it. A reminder nobody reads is worse than none.
//
// Setting lastActivityAt to `updatedAt` (the last time anything about the
// lead changed) makes the first run reflect real neglect. Leads genuinely
// untouched for months still flag, which is the point.

import mongoose from "mongoose";
import { readFileSync } from "node:fs";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!match) continue;
        const [, key, rawValue] = match;
        if (process.env[key]) continue;
        process.env[key] = rawValue.replace(/^["']|["']$/g, "");
      }
    } catch {
      // File absent — fall through to the real environment.
    }
  }
}

async function main() {
  loadEnv();

  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const leads = mongoose.connection.collection("leads");

  const filter = { lastActivityAt: { $in: [null, undefined] } };
  const pending = await leads.countDocuments(filter);

  console.log(`Leads without lastActivityAt: ${pending}`);

  if (pending === 0) {
    console.log("Nothing to backfill.");
    await mongoose.disconnect();
    return;
  }

  if (dryRun) {
    const sample = await leads
      .find(filter)
      .project({ name: 1, createdAt: 1, updatedAt: 1, dealStatus: 1 })
      .limit(5)
      .toArray();
    console.log("\nSample of what would be set (lastActivityAt = updatedAt):");
    for (const lead of sample) {
      console.log(`  ${lead.name} — ${lead.updatedAt?.toISOString?.() || lead.createdAt?.toISOString?.()}`);
    }
    console.log("\nDry run — nothing written. Re-run without --dry-run to apply.");
    await mongoose.disconnect();
    return;
  }

  // An aggregation pipeline update, so each document gets its OWN updatedAt
  // rather than one timestamp shared across the batch.
  const result = await leads.updateMany(filter, [
    { $set: { lastActivityAt: { $ifNull: ["$updatedAt", "$createdAt"] } } },
  ]);

  console.log(`Backfilled ${result.modifiedCount} leads.`);
  console.log("The follow-up job will now judge them on when they were last worked on.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

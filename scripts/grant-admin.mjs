// Grants (or revokes) platform-admin access for one existing user.
//
//   node scripts/grant-admin.mjs you@example.com
//   node scripts/grant-admin.mjs you@example.com --revoke
//
// This is deliberately the ONLY way to create a platform admin. There is no
// route, no form, and no invite flow that can set User.platformRole — which
// means no bug in the request path can mint one. Granting it requires shell
// access to an environment holding MONGODB_URI, which is a meaningfully
// higher bar than any in-app privilege.
//
// The new admin still can't reach anything until they enrol in 2FA: the admin
// layout shows them the enrolment screen and nothing else until they do.

import mongoose from "mongoose";
import { readFileSync } from "node:fs";

// Minimal .env.local reader — this runs outside Next.js, which is what would
// normally load these. Not a dotenv dependency for a script run twice a year.
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

  const email = process.argv[2]?.toLowerCase();
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("Usage: node scripts/grant-admin.mjs <email> [--revoke]");
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  // A bare collection update rather than importing the User model: the model
  // uses the "@/lib/..." path alias, which only Next.js resolves.
  const users = mongoose.connection.collection("users");
  const user = await users.findOne({ email });

  if (!user) {
    console.error(`No user with the email ${email}.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  await users.updateOne(
    { _id: user._id },
    { $set: { platformRole: revoke ? "none" : "super_admin" } }
  );

  console.log(
    revoke
      ? `Revoked platform admin from ${email}.`
      : `${email} is now a platform admin.\n` +
          `They must sign out and back in (the role is carried on the session token),\n` +
          `then set up two-factor authentication at /admin/dashboard before anything opens up.`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

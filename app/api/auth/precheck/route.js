import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

/**
 * Does this account need a second factor?
 *
 * The login screen asks this before signing in, so it can show the
 * authentication-code field to the handful of accounts that have 2FA and to
 * nobody else. The first version instead revealed the field after any failed
 * attempt, which meant every admin had to fail a login on purpose before they
 * could pass one — annoying, and it trained people to ignore an error message.
 *
 * Why this doesn't leak anything a login attempt wouldn't: it answers only
 * when the password is already correct. A wrong password gets the same
 * `{ ok: false }` as an address that was never registered — no distinction
 * between "no such account", "wrong password", and "suspended", exactly as
 * authorize() in auth.js makes none.
 *
 * It does verify a password without creating a session, so it's rate-limited
 * on the same "login" bucket as the real sign-in (see proxy.js) rather than
 * being left as an unbounded password oracle.
 */
export async function POST(request) {
  const body = (await request.json().catch(() => null)) ?? {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ ok: false });
  }

  try {
    await connectDB();

    const user = await User.findOne({ email }).select("+passwordHash twoFactor.enabled suspendedAt");

    // Compare against a dummy hash when there's no such user, so a missing
    // account and a wrong password take the same time. Skipping the compare
    // would make account existence measurable with a stopwatch.
    const hash = user?.passwordHash || "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const valid = await bcrypt.compare(password, hash);

    if (!user || !user.passwordHash || !valid || user.suspendedAt) {
      return NextResponse.json({ ok: false });
    }

    return NextResponse.json({
      ok: true,
      requiresTwoFactor: Boolean(user.twoFactor?.enabled),
    });
  } catch (err) {
    console.error("Login precheck failed:", err);
    // Fail closed toward the ordinary path: the real sign-in still runs and
    // still enforces 2FA on its own, so the worst case is the code field
    // appearing one step later, not a factor being skipped.
    return NextResponse.json({ ok: false });
  }
}

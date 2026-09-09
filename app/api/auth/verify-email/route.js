import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { consumeToken } from "@/lib/tokens";
import { getAppUrl } from "@/lib/email";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/routing";

/**
 * The link in the verification email.
 *
 * Two things make the redirect target less obvious than it looks:
 *
 *   - The language. This URL is opened from a mail client, so it carries no
 *     locale segment of its own; without one, proxy.js would guess again from
 *     scratch. The cookie is the better answer here — it's the language the
 *     person was using when they signed up.
 *   - Whether they're signed in. Very often they are: they signed up in this
 *     browser and are sitting on /verify-email in another tab. Sending them
 *     to /login would show a sign-in form to someone who already has a
 *     session. The waiting page handles it properly instead — it notices the
 *     address is now confirmed, refreshes the token, and forwards them to
 *     their dashboard.
 */
export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const to = (path) => NextResponse.redirect(`${getAppUrl()}${localePath(locale, path)}`);

  try {
    await connectDB();
    const userId = token ? await consumeToken(token, "verify") : null;

    if (!userId) {
      return to("/login?verify=invalid");
    }

    await User.findByIdAndUpdate(userId, { emailVerified: new Date() });

    // Signed in as the account that was just verified: let the waiting page
    // pick it up and move them along, rather than bouncing them to a login
    // form they don't need.
    const session = await auth();
    if (session?.user?.id === userId) {
      return to("/verify-email");
    }

    return to("/login?verify=success");
  } catch (err) {
    console.error("Verifying email failed:", err);
    return to("/login?verify=error");
  }
}

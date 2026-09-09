import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerT } from "@/lib/i18n/server";
import { hasRole } from "@/lib/roles";

/**
 * The auth-check boilerplate every tenant-scoped route handler starts with,
 * in one call. On success returns `{ session, t, locale, tenantId }`; on
 * failure returns `{ res }` — a 401 NextResponse the caller returns as-is.
 *
 *   const ctx = await requireTenantSession();
 *   if (ctx.res) return ctx.res;
 *   const { t, tenantId } = ctx;
 *
 * Deliberately does NOT call connectDB(): every route already wraps its own
 * `await connectDB()` + query in a try/catch that turns a DB outage into a
 * friendly, localized, route-specific message (e.g. "api.contacts.loadFailed").
 * Folding connectDB() in here would move that failure outside those catch
 * blocks — `t` would still resolve, but each route's own tailored error copy
 * wouldn't.
 */
export async function requireTenantSession() {
  const { t, locale } = await getServerT();
  const session = await auth();
  if (!session?.user?.tenantId) {
    return { res: NextResponse.json({ error: t("api.common.notAuthenticated") }, { status: 401 }) };
  }

  // proxy.js keeps an unverified account out of the dashboard UI, but it does
  // not run over the API subtree (see its matcher) — so without this check the
  // CRM would still be fully usable by anyone willing to call the endpoints
  // directly. 403, not 401: the session is real, it just isn't allowed here
  // yet, and a 401 would send the client off to sign in again pointlessly.
  //
  // Deliberately not applied in auth.js's authorize(): an unverified user must
  // still be able to hold a session, because asking for a fresh verification
  // link (/api/auth/resend-verification) requires knowing who is asking.
  if (!session.user.emailVerified) {
    return {
      res: NextResponse.json({ error: t("api.common.emailNotVerified") }, { status: 403 }),
    };
  }

  return { session, t, locale, tenantId: session.user.tenantId };
}

/**
 * Same as requireTenantSession(), plus a minimum-role check — for the routes
 * that change the tenant's own configuration (settings, landing-page copy,
 * pipeline stages, AI regeneration, team management) rather than day-to-day
 * CRM work, which stays open to every role. Returns `{ res }` — a 403 — for
 * a signed-in member whose role doesn't meet `minimumRole`.
 *
 *   const ctx = await requireTenantRole("admin");
 *   if (ctx.res) return ctx.res;
 */
export async function requireTenantRole(minimumRole) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx;

  if (!hasRole(ctx.session.user.role, minimumRole)) {
    return { res: NextResponse.json({ error: ctx.t("api.common.forbidden") }, { status: 403 }) };
  }
  return ctx;
}

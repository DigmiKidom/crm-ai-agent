import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { LOCALE_COOKIE, localeFromAcceptLanguage, normalizeLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";
import { isSuperAdmin } from "@/lib/roles";
import { isAppOwnHost } from "@/lib/appHost";

// Which rate-limit bucket (see lib/rateLimit.js) applies to each public,
// abuse-sensitive endpoint. Every route.js listed here has no auth guard of
// its own — that's exactly why it needs a budget.
const BUCKET_BY_PATH = {
  "/api/signup": "signup",
  "/api/auth/callback/credentials": "login",
  // Verifies a password without creating a session, so it shares the login
  // budget rather than giving an attacker a second, unthrottled oracle.
  "/api/auth/precheck": "login",
  "/api/auth/forgot-password": "passwordReset",
  "/api/auth/reset-password": "passwordReset",
  "/api/leads": "leadCapture",
  "/api/report": "pageReport",
};

// Every /admin and /api/admin request shares one budget, matched by prefix
// rather than exact path — unlike the table above, the admin surface is a
// whole subtree and a new route under it must not silently arrive unthrottled.
const ADMIN_PATH = /^\/(admin|api\/admin)(\/|$)/;

// Next.js dropped `request.ip` — Vercel (and any standard reverse proxy)
// still sets `x-forwarded-for`, with the connecting client first in the list.
function clientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Mirrors getServerLocale() in lib/i18n/server.js, but built on the
// proxy-native NextRequest APIs (request.cookies / request.headers) rather
// than next/headers — cookies()/headers() from next/headers are only valid
// inside a Server Component or Route Handler, not the proxy/middleware layer.
function localeFromRequest(request) {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (fromCookie) return normalizeLocale(fromCookie);
  return localeFromAcceptLanguage(request.headers.get("accept-language"));
}

async function rateLimitResponse(request) {
  const path = request.nextUrl.pathname;
  const bucket = ADMIN_PATH.test(path) ? "admin" : BUCKET_BY_PATH[path];
  if (!bucket) return null;

  const ip = clientIp(request);
  const { limited, retryAfterSeconds } = await checkRateLimit(bucket, ip);
  if (!limited) return null;

  const locale = localeFromRequest(request);
  const message = translate(locale, "api.common.tooManyRequests", { seconds: retryAfterSeconds });
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

// Three independent jobs share this one proxy file (Next.js 16 allows only a
// single middleware.js/proxy.js, not both):
//  1. Rate limiting a handful of public, abuse-sensitive endpoints.
//  2. Protecting the CRM dashboard: requires a logged-in session, and blocks
//     a user from one tenant loading another tenant's dashboard by editing
//     the URL's tenantSlug segment.
//  3. Routing a tenant's own custom domain (see app/custom-domain/page.js) —
//     a request whose Host header isn't this app's own gets rewritten there,
//     carrying the raw hostname, since the MongoDB lookup that resolves it
//     to a tenant needs Node.js (this file runs on the Edge runtime).
export default auth(async (req) => {
  const { nextUrl } = req;

  if (nextUrl.pathname === "/") {
    const host = req.headers.get("host");
    if (!isAppOwnHost(host)) {
      const url = new URL("/custom-domain", nextUrl.origin);
      url.searchParams.set("host", host.split(":")[0].toLowerCase());
      return NextResponse.rewrite(url);
    }
  }

  const limited = await rateLimitResponse(req);
  if (limited) return limited;

  // Platform admin surface. This is the outer perimeter only — a cheap check
  // against the JWT that keeps unauthenticated traffic off the subtree
  // entirely. It is NOT the authorization decision: every admin page and
  // route re-verifies against the live User document (see lib/adminSession.js),
  // because a JWT still carries `platformRole: "super_admin"` for however long
  // it lives after someone's access is revoked.
  //
  // Rewrites to /not-found rather than redirecting: a redirect to /login tells
  // a prober that /admin is a real, protected thing. A 404 tells them nothing.
  if (ADMIN_PATH.test(nextUrl.pathname)) {
    if (!isSuperAdmin(req.auth?.user?.platformRole)) {
      // JSON for the API subtree, the ordinary 404 page for everything else —
      // an HTML body returned to a fetch() is its own kind of broken.
      return nextUrl.pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Not found" }, { status: 404 })
        : NextResponse.rewrite(new URL("/not-found", nextUrl.origin), { status: 404 });
    }
    return NextResponse.next();
  }

  const match = nextUrl.pathname.match(/^\/t\/([^/]+)/);
  if (!match) return NextResponse.next();

  const session = req.auth;
  const requestedSlug = match[1];

  if (!session?.user) {
    const loginUrl = new URL("/login", nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.tenantSlug !== requestedSlug) {
    // Logged in, but this isn't their tenant — send them to their own dashboard
    // rather than exposing someone else's data.
    const ownUrl = new URL(`/t/${session.user.tenantSlug}`, nextUrl.origin);
    return NextResponse.redirect(ownUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/t/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/signup",
    "/api/auth/callback/credentials",
    "/api/auth/precheck",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/leads",
    "/api/report",
  ],
};

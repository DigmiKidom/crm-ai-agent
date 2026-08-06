import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { LOCALE_COOKIE, localeFromAcceptLanguage, normalizeLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";

// Which rate-limit bucket (see lib/rateLimit.js) applies to each public,
// abuse-sensitive endpoint. Every route.js listed here has no auth guard of
// its own — that's exactly why it needs a budget.
const BUCKET_BY_PATH = {
  "/api/signup": "signup",
  "/api/auth/callback/credentials": "login",
  "/api/auth/forgot-password": "passwordReset",
  "/api/auth/reset-password": "passwordReset",
  "/api/leads": "leadCapture",
};

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
  const bucket = BUCKET_BY_PATH[request.nextUrl.pathname];
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

// Two independent jobs share this one proxy file (Next.js 16 allows only a
// single middleware.js/proxy.js, not both):
//  1. Rate limiting a handful of public, abuse-sensitive endpoints.
//  2. Protecting the CRM dashboard: requires a logged-in session, and blocks
//     a user from one tenant loading another tenant's dashboard by editing
//     the URL's tenantSlug segment.
export default auth(async (req) => {
  const { nextUrl } = req;

  const limited = await rateLimitResponse(req);
  if (limited) return limited;

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
    "/t/:path*",
    "/api/signup",
    "/api/auth/callback/credentials",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/leads",
  ],
};

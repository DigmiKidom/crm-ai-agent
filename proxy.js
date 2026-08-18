import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { LOCALE_COOKIE, localeFromAcceptLanguage, normalizeLocale } from "@/lib/i18n/config";
import { isUnlocalizedPath, localePath, splitLocale } from "@/lib/i18n/routing";
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
//
// Matched against the path with its locale segment already stripped, so
// /he/admin and /en/admin are the same subtree as far as this is concerned.
const ADMIN_PATH = /^\/(admin|api\/admin)(\/|$)/;

// Next.js dropped `request.ip` — Vercel (and any standard reverse proxy)
// still sets `x-forwarded-for`, with the connecting client first in the list.
function clientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * The locale to send a visitor to when the URL doesn't name one.
 *
 * Only ever used to *choose a redirect target*. Once the redirect lands, the
 * path segment is the sole source of truth — the cookie is a memory of what
 * this person picked last time, not an input to rendering. That split is what
 * removes the old failure mode, where a stale cookie and the URL could
 * describe two different languages and the layout had to guess between them.
 */
function preferredLocale(request) {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (fromCookie) return normalizeLocale(fromCookie);
  return localeFromAcceptLanguage(request.headers.get("accept-language"));
}

async function rateLimitResponse(request, adminPath) {
  const path = request.nextUrl.pathname;
  const bucket = adminPath ? "admin" : BUCKET_BY_PATH[path];
  if (!bucket) return null;

  const ip = clientIp(request);
  const { limited, retryAfterSeconds } = await checkRateLimit(bucket, ip);
  if (!limited) return null;

  const message = translate(preferredLocale(request), "api.common.tooManyRequests", {
    seconds: retryAfterSeconds,
  });
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

// Four independent jobs share this one proxy file (Next.js 16 allows only a
// single middleware.js/proxy.js, not both):
//  1. Routing a tenant's own custom domain (see app/(public)/custom-domain/page.js) —
//     a request whose Host header isn't this app's own gets rewritten there,
//     carrying the raw hostname, since the MongoDB lookup that resolves it
//     to a tenant needs Node.js (this file runs on the Edge runtime).
//  2. Putting a locale on every UI URL that arrives without one, so the app
//     never has to render a page before it knows what language it is in.
//  3. Rate limiting a handful of public, abuse-sensitive endpoints.
//  4. Protecting the CRM dashboard: requires a logged-in session, and blocks
//     a user from one tenant loading another tenant's dashboard by editing
//     the URL's tenantSlug segment.
export default auth(async (req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // (1) Custom domains, before anything else: a visitor on a tenant's own
  // hostname must never be redirected into /en or /he — that's our language
  // routing on their brand's URL.
  if (pathname === "/") {
    const host = req.headers.get("host");
    if (!isAppOwnHost(host)) {
      const url = new URL("/custom-domain", nextUrl.origin);
      url.searchParams.set("host", host.split(":")[0].toLowerCase());
      return NextResponse.rewrite(url);
    }
  }

  // (2) Locale prefix. /api, a tenant's /pages/<slug> and the other
  // content-owned routes are exempt — see UNLOCALIZED_PREFIXES.
  const { locale: pathLocale, rest } = splitLocale(pathname);

  if (!isUnlocalizedPath(pathname) && !pathLocale) {
    const target = new URL(localePath(preferredLocale(req), pathname), nextUrl.origin);
    target.search = nextUrl.search;
    // 307, not 308: which language an un-prefixed URL resolves to depends on
    // this visitor's cookie and Accept-Language, so it must not be cached by
    // the browser as a permanent property of the path.
    return NextResponse.redirect(target, 307);
  }

  // Every check below reasons about the route, not the language, so it runs
  // against the path with the locale segment removed.
  const routePath = pathLocale ? rest : pathname;
  const isAdminPath = ADMIN_PATH.test(routePath);

  // The resolved locale, forwarded to the render. Everything inside
  // app/(site)/[locale] reads it from its own params; this header is for the
  // one place with no params to read — app/global-not-found.js, which Next
  // renders detached from the route tree.
  const forwarded = new Headers(req.headers);
  forwarded.set("x-locale", pathLocale || preferredLocale(req));
  const proceed = () => NextResponse.next({ request: { headers: forwarded } });

  // (3)
  const limited = await rateLimitResponse(req, isAdminPath);
  if (limited) return limited;

  // (4a) Platform admin surface. This is the outer perimeter only — a cheap
  // check against the JWT that keeps unauthenticated traffic off the subtree
  // entirely. It is NOT the authorization decision: every admin page and
  // route re-verifies against the live User document (see lib/adminSession.js),
  // because a JWT still carries `platformRole: "super_admin"` for however long
  // it lives after someone's access is revoked.
  //
  // Rewrites to a 404 rather than redirecting to /login: a redirect tells a
  // prober that /admin is a real, protected thing. A 404 tells them nothing.
  if (isAdminPath) {
    if (!isSuperAdmin(req.auth?.user?.platformRole)) {
      // JSON for the API subtree, the ordinary 404 page for everything else —
      // an HTML body returned to a fetch() is its own kind of broken.
      if (routePath.startsWith("/api/")) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      // Rewritten inside the visitor's own locale, carrying the same x-locale
      // header a real request would, so the 404 they get is identical — same
      // language, same direction — to a genuine one.
      const notFoundUrl = new URL(
        localePath(pathLocale || preferredLocale(req), "/not-found"),
        nextUrl.origin
      );
      return NextResponse.rewrite(notFoundUrl, {
        status: 404,
        request: { headers: forwarded },
      });
    }
    return proceed();
  }

  // (4b)
  const match = routePath.match(/^\/t\/([^/]+)/);
  if (!match) return proceed();

  const session = req.auth;
  const requestedSlug = match[1];
  const locale = pathLocale || preferredLocale(req);

  if (!session?.user) {
    return NextResponse.redirect(new URL(localePath(locale, "/login"), nextUrl.origin));
  }

  if (session.user.tenantSlug !== requestedSlug) {
    // Logged in, but this isn't their tenant — send them to their own dashboard
    // rather than exposing someone else's data.
    return NextResponse.redirect(
      new URL(localePath(locale, `/t/${session.user.tenantSlug}`), nextUrl.origin)
    );
  }

  return proceed();
});

export const config = {
  matcher: [
    // Every UI route, so a path that arrives without a locale is redirected no
    // matter how new it is — an allow-list here would mean each page added to
    // the app is one someone has to remember to register, and forgetting shows
    // up as a page rendering in the wrong language rather than as an error.
    //
    // Excluded: /api (listed individually below, so the auth() unwrap and the
    // Edge hop stay off endpoints that gain nothing from them), the
    // tenant-facing routes that own their own language, and static assets.
    "/((?!api/|pages/|l/|cv/|custom-domain|suspended|_next/|favicon\\.ico|icon\\.svg|logo/|tutorial/|video/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|txt|xml|json|webmanifest)$).*)",
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

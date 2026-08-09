// Which hostnames belong to the app itself, as opposed to a tenant's own
// custom domain.
//
// Extracted from proxy.js so it can be tested without loading the Edge
// runtime — it caused a total production outage once (see below) and that is
// not a thing to leave untested.

/**
 * Reduces a host or a full URL to a bare, comparable hostname.
 * "https://www.Ceramony.co/" and "ceramony.co:3000" both become "ceramony.co".
 *
 * The www. strip matters: an APP_URL of https://www.ceramony.co and a visitor
 * on https://ceramony.co are the same site to everyone except a string
 * comparison.
 */
export function normalizeHost(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  const withScheme = raw.includes("://") ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * True for every hostname this app is reachable on: the primary domain
 * (APP_URL), the Vercel-assigned production and deployment URLs, any
 * *.vercel.app preview, and localhost in development.
 *
 * A false answer routes the request to app/custom-domain/page.js, which looks
 * the host up as a tenant's verified domain and 404s when there isn't one.
 * That is the correct behaviour for a genuinely unknown host — and a
 * catastrophic one for the app's own domain.
 *
 * Hence the deliberate fail-open below. The first version returned false when
 * APP_URL was unset or unparseable, on the reasoning that an unrecognised
 * host must be a tenant's. In production, with APP_URL missing, that turned
 * every request to the marketing site, the login page, and the dashboard into
 * a 404 — one absent environment variable took the whole product down.
 *
 * When we cannot tell whose host this is, serving the app is the recoverable
 * mistake; a custom domain that briefly shows the marketing site is a support
 * ticket, whereas a site-wide 404 is an outage.
 */
export function isAppOwnHost(host, env = process.env) {
  if (!host) return true;

  const hostname = normalizeHost(host);
  if (!hostname) return true;

  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname.endsWith(".vercel.app")) return true;

  const known = [
    env.APP_URL,
    // Set by Vercel automatically: the stable production domain, and this
    // specific deployment's URL. Both are ours by definition, and having
    // them here means a correct APP_URL is no longer the only thing standing
    // between the site and a 404.
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_URL,
  ]
    .map(normalizeHost)
    .filter(Boolean);

  // Nothing to compare against — assume ours. See the note above.
  if (known.length === 0) return true;

  return known.includes(hostname);
}

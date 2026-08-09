import crypto from "crypto";

// A conservative, well-known set of crawler/bot user-agent substrings.
// Heuristic, not exhaustive — a bot spoofing a real browser UA won't be
// caught, and that's an accepted, honestly-documented limitation (same
// spirit as the rest of the analytics screen labeling its approximations
// rather than pretending to a precision it doesn't have). This catches the
// overwhelming majority of automated traffic (search crawlers, uptime
// monitors, link-preview fetchers, headless-browser test tools) without
// needing a maintained third-party bot list.
const BOT_UA_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|headlesschrome|phantomjs|puppeteer|playwright|curl|wget|python-requests|monitor|pingdom|uptimerobot|ahrefs|semrush|mj12bot/i;

export function isLikelyBot(userAgent) {
  // No UA at all is itself a strong bot/script signal — every real browser
  // sends one.
  if (!userAgent || !userAgent.trim()) return true;
  return BOT_UA_RE.test(userAgent);
}

/**
 * A visitor fingerprint that's stable for one visitor on one day, and
 * unrecoverable to anything beyond that: it's a one-way hash of IP + UA +
 * tenant + the day's own date string, so tomorrow's hash for the same
 * visitor is unrelated to today's. That's what makes this "cookieless
 * tracking" rather than just "tracking without a cookie" — there's no
 * persistent identifier anywhere, client or server, so there's nothing here
 * a cookie-consent regime would consider tracking in the first place.
 */
export function dailyVisitorHash({ ip, userAgent, tenantId, dateKey }) {
  return crypto
    .createHash("sha256")
    .update(`${ip}|${userAgent}|${tenantId}|${dateKey}`)
    .digest("hex");
}

/**
 * "YYYY-MM-DD" from the server's local date components — deliberately NOT
 * `toISOString().slice(0, 10)` (UTC), because lib/analytics.js's own
 * `bucketKey()` bucket everything (leads, contacts) by local date parts
 * (`getFullYear()`/`getMonth()`/`getDate()`). Visits have to bucket the same
 * way, or a visit and a lead captured in the same real-world hour could land
 * in different day-buckets. In production (Vercel runs UTC) local time IS
 * UTC, so this only matters in a non-UTC local dev environment — but it has
 * to match regardless.
 */
export function dateKeyFor(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

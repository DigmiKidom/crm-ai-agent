// Client-only cookie helpers for the headline A/B test (see
// components/templates/shared/ABHeadline.js and Tenant.landingPage.headlineVariantB).
//
// This has to be a client-side mechanism, not a server-computed split: the
// public landing page is ISR-cached (`revalidate = 60` in
// app/pages/[tenantSlug]/page.js), so every visitor is served the SAME
// pre-rendered HTML — there is no per-request server branch to hook a split
// into without breaking that cache. Assignment happens after hydration
// instead, which trades a brief flash for a visitor assigned to "b" against
// keeping the page's performance profile unchanged for everyone else.
const AB_HEADLINE_COOKIE = "ceramony_ab_headline";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days — long enough to run a real test, short enough that a visitor's assignment doesn't outlive it indefinitely.

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Scoped to this tenant's own page path (not a tenant id baked into the
// cookie name) so two tenants visited in the same browser never collide —
// the browser only ever sends a path-scoped cookie back to a matching path.
function writeCookie(name, value, tenantSlug) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/pages/${tenantSlug}; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

/**
 * Client-only. Returns "a" or "b" for this visitor, assigning and persisting
 * a fresh 50/50 pick on their first visit and honouring it on every one after.
 */
export function getOrAssignHeadlineVariant(tenantSlug) {
  const existing = readCookie(AB_HEADLINE_COOKIE);
  if (existing === "a" || existing === "b") return existing;

  const assigned = Math.random() < 0.5 ? "a" : "b";
  writeCookie(AB_HEADLINE_COOKIE, assigned, tenantSlug);
  return assigned;
}

/**
 * Client-only, read-only — used by the lead form to attribute a submission.
 * Never assigns: a tenant not running the test has no cookie to read, and a
 * lead from them should carry no variant rather than one being invented here.
 */
export function readHeadlineVariant() {
  const value = readCookie(AB_HEADLINE_COOKIE);
  return value === "a" || value === "b" ? value : null;
}

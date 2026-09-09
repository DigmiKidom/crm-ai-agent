// What each billing plan is actually worth, in one place.
//
// Model-free and React-free for the same reason as lib/plugins.js: the
// landing-page editor is a client component and must be able to import its
// own limits without dragging mongoose into the browser bundle, while the
// Tenant schema and the API route need the identical numbers on the server.
// A limit that lives in two files is a limit that will disagree with itself.
//
// `Tenant.plan` is written in exactly one place — the Stripe webhook (see
// app/api/billing/webhook/route.js). Nothing here grants anything; these are
// only the consequences of whatever that wrote.

export const PLANS = ["free", "pro"];
export const DEFAULT_PLAN = "free";

// ── Photo gallery ───────────────────────────────────────────────────────────
// Free keeps the six it has always had, so no existing page loses anything.
export const FREE_GALLERY_PHOTOS = 6;
export const PRO_GALLERY_PHOTOS = 15;

// ── Item list ───────────────────────────────────────────────────────────────
// A menu, price list, or product range shown on the landing page. Pro only,
// and capped: past fifteen it stops being a highlight reel and starts being a
// catalogue that wants search, categories and stock — a different product.
export const PRO_CATALOG_ITEMS = 15;

/**
 * The ceiling the Tenant schema validates against, independent of plan.
 *
 * Plan limits are enforced on the way in (the PATCH route reads the tenant's
 * current plan); the schema only guards against a stored document growing
 * past anything we would ever allow. Keeping them separate matters at the
 * moment a subscription lapses: a downgraded tenant's saved page still has to
 * load and still has to be editable, so the schema must not reject data that
 * was legitimately written while they were paying.
 */
export const MAX_GALLERY_PHOTOS = PRO_GALLERY_PHOTOS;
export const MAX_CATALOG_ITEMS = PRO_CATALOG_ITEMS;

export function isProPlan(plan) {
  return plan === "pro";
}

/** How many gallery photos this plan may save. */
export function galleryLimit(plan) {
  return isProPlan(plan) ? PRO_GALLERY_PHOTOS : FREE_GALLERY_PHOTOS;
}

/** How many catalog items this plan may save. Zero means "not included". */
export function catalogLimit(plan) {
  return isProPlan(plan) ? PRO_CATALOG_ITEMS : 0;
}

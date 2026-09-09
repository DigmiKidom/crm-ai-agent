// The landing page's item list — a menu, price list, or product range.
//
// Model-free, for the same reason as lib/faq.js and lib/formFields.js: the
// editor is a client component and can't import the Tenant model to learn its
// own limits.
//
// Deliberately NOT a shop. There is no cart, no checkout, no stock count and
// no payment anywhere in this feature: it exists so a visitor can see what a
// business offers and then contact them about it, which is what the rest of
// this product is for. The only action attached to the section is a link to
// the lead form.

import { MAX_CATALOG_ITEMS } from "@/lib/plan";

export { MAX_CATALOG_ITEMS };

export const MAX_CATALOG_TITLE = 80;
export const MAX_CATALOG_DESCRIPTION = 220;
// Free text rather than a number plus a currency: businesses write "₪120",
// "From $50", "Price on request" and "2 for 1", and forcing that into a
// decimal would either reject the honest answer or invent precision the
// business didn't offer. Nothing is ever computed from this — it is a label.
export const MAX_CATALOG_PRICE = 40;
export const MAX_CATALOG_NOTE = 200;

export function blankCatalogItem() {
  return { title: "", description: "", price: "", mediaId: null };
}

function catalogError(code, message, data) {
  return Object.assign(new Error(message), { code, ...data });
}

/**
 * Validates and normalizes the item list submitted to the landing-page PATCH
 * route.
 *
 * A row that is entirely blank is dropped rather than rejected — the editor
 * keeps one empty row to type into, and a tenant who doesn't want an item
 * list shouldn't have to delete it before they can save. A row with a price
 * or a photo but no title IS rejected: a nameless card is not something a
 * visitor can act on, and silently dropping it would lose an upload.
 *
 * `limit` comes from the tenant's plan (see lib/plan.js). A limit of zero
 * means the plan doesn't include the feature at all, which is a different
 * error from having gone over an allowance.
 *
 * Errors carry a stable `code` the API route maps to a localized message;
 * this module has no request context to translate with itself.
 */
export function normalizeCatalog(input, { limit = MAX_CATALOG_ITEMS } = {}) {
  if (!Array.isArray(input)) return [];

  const cleaned = [];
  for (const raw of input) {
    const title = String(raw?.title ?? "").trim();
    const description = String(raw?.description ?? "").trim();
    const price = String(raw?.price ?? "").trim();
    const mediaId = raw?.mediaId ? String(raw.mediaId) : null;

    if (!title && !description && !price && !mediaId) continue;
    if (!title) {
      throw catalogError("MISSING_TITLE", "Every item needs a name.");
    }

    cleaned.push({
      title: title.slice(0, MAX_CATALOG_TITLE),
      description: description.slice(0, MAX_CATALOG_DESCRIPTION),
      price: price.slice(0, MAX_CATALOG_PRICE),
      mediaId,
    });
  }

  if (cleaned.length === 0) return [];

  if (limit <= 0) {
    throw catalogError("NOT_INCLUDED", "The item list is not included in this plan.");
  }

  if (cleaned.length > limit) {
    throw catalogError("TOO_MANY", `You can have at most ${limit} items.`, { n: limit });
  }

  return cleaned;
}

/** Every image referenced by an item list, for the ownership check on save. */
export function catalogMediaIds(items) {
  return [...new Set((items || []).map((item) => item?.mediaId).filter(Boolean).map(String))];
}

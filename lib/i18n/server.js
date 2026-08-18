import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  normalizeLocale,
} from "./config";
import { createTranslator, getDictionary } from "./translate";

function bundle(locale) {
  return {
    locale,
    t: createTranslator(locale),
    dictionary: getDictionary(locale),
  };
}

/**
 * The translator for a page or layout inside app/(site)/[locale].
 *
 *   export default async function SettingsPage({ params }) {
 *     const { t } = await getRouteT(params);
 *
 * The locale comes straight off the URL segment, so it cannot disagree with
 * the `lang`/`dir` the layout already rendered, and it needs no dynamic API —
 * these routes stay as statically renderable as their own data allows. This
 * replaces getServerT() everywhere a route segment is available; the cookie
 * version below is now only for code that has no URL to read.
 */
export async function getRouteT(params) {
  const resolved = params ? await params : null;
  return bundle(normalizeLocale(resolved?.locale));
}

/** Just the locale, for callers that don't need a translator. */
export async function getRouteLocale(params) {
  const resolved = params ? await params : null;
  return normalizeLocale(resolved?.locale);
}

/**
 * Locale resolution for code with no locale segment to read: API route
 * handlers, and anything else outside app/(site)/[locale].
 *
 * These genuinely have no URL-borne language — an API request carries whatever
 * the client's cookie and Accept-Language say — so the old cookie-then-header
 * chain is still the right answer here, and only here. Prefer getRouteT() in
 * any page or layout; a route segment is exact, this is a best guess.
 */
export async function getServerLocale() {
  try {
    const store = await cookies();
    const fromCookie = store.get(LOCALE_COOKIE)?.value;
    if (fromCookie) return normalizeLocale(fromCookie);

    // No explicit choice yet — honour the browser's preference once.
    const headerStore = await headers();
    return localeFromAcceptLanguage(headerStore.get("accept-language"));
  } catch {
    // Called outside a request scope (e.g. during static generation).
    return DEFAULT_LOCALE;
  }
}

/** Convenience bundle for API handlers: `const { t } = await getServerT()`. */
export async function getServerT() {
  return bundle(await getServerLocale());
}

import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  normalizeLocale,
} from "./config";
import { createTranslator, getDictionary } from "./translate";

/**
 * Server-side locale resolution, for routes that are already dynamic.
 *
 * Important: do NOT call this from `app/layout.js`. Reading cookies() in the
 * root layout opts every route in the app into dynamic rendering, which would
 * kill the ISR caching on the public tenant landing pages
 * (`/pages/[tenantSlug]`, `revalidate = 60`). The root layout instead sets
 * <html lang/dir> from a pre-hydration script, and client components get their
 * locale from LocaleProvider. This helper is for dashboard routes and API
 * handlers, which are request-scoped anyway.
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

/** Convenience bundle: `const { t, locale, dir } = await getServerT()`. */
export async function getServerT() {
  const locale = await getServerLocale();
  return {
    locale,
    t: createTranslator(locale),
    dictionary: getDictionary(locale),
  };
}

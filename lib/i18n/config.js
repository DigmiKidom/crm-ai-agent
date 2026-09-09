// Locale registry. Deliberately dependency-free: the rest of this codebase
// hand-builds its icons, charts, and markdown rather than pulling a library,
// and i18n follows the same rule. The alternative (next-intl) would force
// every route under app/[locale]/..., which is a 25-file migration for
// behaviour this module covers in ~60 lines.

export const LOCALES = ["en", "he", "es"];
export const DEFAULT_LOCALE = "en";

// `dir` drives the <html dir> attribute, which is what makes every
// `*-inline-start` / `*-inline-end` rule in the stylesheets flip. Nothing
// else in the app needs to know about text direction.
export const LOCALE_META = {
  en: { code: "en", label: "English", shortLabel: "EN", dir: "ltr", htmlLang: "en" },
  he: { code: "he", label: "עברית", shortLabel: "HE", dir: "rtl", htmlLang: "he" },
  es: { code: "es", label: "Español", shortLabel: "ES", dir: "ltr", htmlLang: "es" },
};

// Read on the server (cookies()) and written on the client (document.cookie),
// so the value has to survive a round trip as a plain string.
export const LOCALE_COOKIE = "ceramony_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

/** Narrows any untrusted value (cookie, query param, header) to a real locale. */
export function normalizeLocale(value) {
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function getDir(locale) {
  return LOCALE_META[normalizeLocale(locale)].dir;
}

export function isRtl(locale) {
  return getDir(locale) === "rtl";
}

// ── Where the visitor is ────────────────────────────────────────────────────
//
// A first-time visitor has no cookie and no history with us, and
// Accept-Language turns out to be a poor first guess for this product: the
// overwhelming majority of Israeli users browse on a device shipped with
// en-US as its system language, so a header-first rule sent almost every
// Hebrew-speaking visitor to an English page they then had to switch out of.
//
// Region is the better signal, so it goes first. Only the languages the
// product actually ships (see LOCALES) appear here — a country that speaks
// something else falls through to DEFAULT_LOCALE, which is the honest
// outcome: we have nothing better to offer it.
export const COUNTRY_LOCALE = {
  IL: "he",

  // The Spanish-speaking countries, listed rather than inferred: es is a
  // first-class product locale, and sending Mexico to English when we have a
  // Spanish UI would be the same mistake as sending Israel there.
  AR: "es", BO: "es", CL: "es", CO: "es", CR: "es", CU: "es", DO: "es",
  EC: "es", ES: "es", GQ: "es", GT: "es", HN: "es", MX: "es", NI: "es",
  PA: "es", PE: "es", PR: "es", PY: "es", SV: "es", UY: "es", VE: "es",
};

// The headers a CDN or reverse proxy puts the visitor's country in, in the
// order we trust them. Vercel's is first because that's where this runs;
// Cloudflare's and the generic one are here so a self-hosted deployment
// behind either still gets region routing instead of silently falling back.
//
// Client-supplied by definition — anyone can send x-vercel-ip-country by
// hand. That's acceptable for exactly this: the value picks a *language*, it
// grants nothing, and a visitor who forges one has merely chosen the language
// they could have chosen from the menu anyway.
export const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
];

/** The locale for an ISO-3166 country code, or null if we don't ship one. */
export function localeFromCountry(country) {
  if (!country) return null;
  const code = String(country).trim().toUpperCase();
  const locale = COUNTRY_LOCALE[code];
  return locale && LOCALES.includes(locale) ? locale : null;
}

/** Reads whichever country header this deployment's edge actually set. */
export function countryFromHeaders(headers) {
  if (!headers?.get) return null;
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name);
    // Vercel sends "XX" for an address it can't place; treat it as absent
    // rather than as a country we don't ship a language for.
    if (value && value !== "XX") return value;
  }
  return null;
}

/**
 * Best-effort match of an `Accept-Language` header to a supported locale.
 * Used only as a fallback for first-time visitors with no cookie set.
 */
export function localeFromAcceptLanguage(header) {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return {
        base: tag.trim().toLowerCase().split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter((entry) => entry.base)
    .sort((a, b) => b.quality - a.quality);

  // Hebrew's ISO 639-1 code changed from "iw" to "he" in 1989, but some older
  // Android and Java clients still send the legacy tag.
  const match = ranked.find(
    (entry) => LOCALES.includes(entry.base) || entry.base === "iw"
  );
  if (!match) return DEFAULT_LOCALE;
  return match.base === "iw" ? "he" : match.base;
}

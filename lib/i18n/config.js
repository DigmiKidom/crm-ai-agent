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

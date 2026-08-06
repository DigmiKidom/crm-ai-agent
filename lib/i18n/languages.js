// Content languages a tenant's landing page can be written in.
//
// Deliberately separate from lib/i18n/config.js. That file covers the *product
// UI* (English/Hebrew), which is a per-user preference. This is the language a
// tenant's public landing page is written in — a property of their content, not
// of whoever is viewing it. A Hebrew business's landing page must render in
// Hebrew and RTL even for a visitor whose own UI is English.

export const AUTO_LANGUAGE = "auto";

// `dir` here is the *script* direction, used to set dir= on the public page.
export const CONTENT_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "he", name: "Hebrew", nativeName: "עברית", dir: "rtl" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", dir: "ltr" },
  { code: "it", name: "Italian", nativeName: "Italiano", dir: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", dir: "ltr" },
];

const BY_CODE = new Map(CONTENT_LANGUAGES.map((l) => [l.code, l]));

// Scripts written right-to-left. Used when the agent reports a language we
// don't have in the list above — better to get the direction right for a
// language we didn't anticipate than to default everything to LTR.
const RTL_CODES = new Set(["he", "iw", "ar", "fa", "ur", "yi", "ji", "dv", "ps", "ku", "sd"]);

export function isRtlLanguage(code) {
  if (!code) return false;
  return RTL_CODES.has(String(code).toLowerCase().split("-")[0]);
}

export function findContentLanguage(code) {
  if (!code) return null;
  return BY_CODE.get(String(code).toLowerCase().split("-")[0]) ?? null;
}

/**
 * Normalises whatever the agent reported into something safe to store.
 *
 * The agent is asked for a BCP-47 code, but it's a language model — it may
 * return "Hebrew", "he-IL", or an unexpected code. This accepts all of those
 * rather than discarding a correct answer on a formatting technicality.
 */
export function resolveContentLanguage(code, fallbackName = "") {
  const raw = String(code || "").trim();
  const base = raw.toLowerCase().split(/[-_]/)[0];

  const known = BY_CODE.get(base);
  if (known) return { ...known };

  // Agent answered with a name ("Hebrew") instead of a code.
  const byName = CONTENT_LANGUAGES.find(
    (l) =>
      l.name.toLowerCase() === raw.toLowerCase() ||
      l.nativeName.toLowerCase() === raw.toLowerCase()
  );
  if (byName) return { ...byName };

  if (!base) return { ...BY_CODE.get("en") };

  // A real language we simply don't list. Keep it, and infer direction.
  return {
    code: base,
    name: fallbackName || raw,
    nativeName: fallbackName || raw,
    dir: isRtlLanguage(base) ? "rtl" : "ltr",
  };
}

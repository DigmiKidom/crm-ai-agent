import en from "./dictionaries/en.json";
import he from "./dictionaries/he.json";
import es from "./dictionaries/es.json";
import { DEFAULT_LOCALE, normalizeLocale } from "./config";

// Each dictionary is a couple of KB of static JSON, so they're imported
// eagerly rather than code-split. Dynamic import would buy a negligible amount
// of bundle size back at the cost of an async boundary in every consumer.
export const DICTIONARIES = { en, he, es };

export function getDictionary(locale) {
  return DICTIONARIES[normalizeLocale(locale)] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** Walks a dotted path ("footer.rights") without throwing on a missing branch. */
function lookup(dict, key) {
  let node = dict;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Resolves `key` against `locale`, falling back to English and finally to the
 * key itself, so a missing Hebrew string degrades to readable English rather
 * than a blank element. `vars` fills `{placeholders}`.
 */
export function translate(locale, key, vars) {
  const resolved =
    lookup(getDictionary(locale), key) ?? lookup(DICTIONARIES[DEFAULT_LOCALE], key) ?? key;

  if (!vars) return resolved;

  return resolved.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

/** Curried form, for components that translate more than one string. */
export function createTranslator(locale) {
  return (key, vars) => translate(locale, key, vars);
}

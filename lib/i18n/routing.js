// Path-level locale routing.
//
// The locale used to live in a cookie, which meant the server had no idea
// which language a page was until it had already rendered — hence the
// pre-hydration script in the root layout that patched <html dir> before
// paint, and the class of bugs where a Hebrew user briefly saw an LTR frame.
//
// Now the locale is the first path segment (/he/login, /en/t/acme), so it is
// known before a single component runs: the layout sets lang/dir from it, and
// every server component gets it as a plain param. This module is the one
// place that knows how to put a locale into a path and take it back out.

import { DEFAULT_LOCALE, LOCALES, normalizeLocale } from "./config";

/**
 * Top-level path prefixes that must never carry a locale segment.
 *
 * The tenant-facing pages are the interesting ones: /pages/<slug> is a
 * customer's own landing page, written in *their* content language (see
 * lib/i18n/languages.js). Prefixing it with the viewer's UI locale would both
 * lie about the content and split one page across three URLs for search
 * engines. /api and /suspended have no UI at all.
 */
export const UNLOCALIZED_PREFIXES = [
  "/api",
  "/pages",
  "/l",
  "/cv",
  // A feedback form a business sends to its customers. Same reasoning as
  // /pages: the link goes out by WhatsApp and lives in someone's message
  // history, so it has to stay one short, stable URL rather than three.
  "/s",
  "/custom-domain",
  "/suspended",
];

// Framework and file-convention paths, which never belong to a route tree.
const INTERNAL_PATH = /^\/(_next|__nextjs|favicon\.ico|icon\.svg|robots\.txt|sitemap\.xml|manifest\.webmanifest|opengraph-image|apple-icon)(\/|$|\.)/;

const LOCALE_SEGMENT = new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`);

/** True for paths that own their own language and must stay un-prefixed. */
export function isUnlocalizedPath(pathname) {
  if (!pathname || !pathname.startsWith("/")) return true;
  if (INTERNAL_PATH.test(pathname)) return true;
  return UNLOCALIZED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Splits "/he/t/acme" into { locale: "he", rest: "/t/acme" }.
 * A path with no locale segment comes back as { locale: null, rest: path }.
 */
export function splitLocale(pathname) {
  const path = pathname || "/";
  const match = path.match(LOCALE_SEGMENT);
  if (!match) return { locale: null, rest: path };
  const rest = path.slice(match[0].length);
  return { locale: match[1], rest: rest || "/" };
}

/** The locale a path is already in, or null. */
export function localeFromPath(pathname) {
  return splitLocale(pathname).locale;
}

/**
 * Prefixes a path with a locale: ("he", "/login") -> "/he/login".
 *
 * Idempotent, and a no-op for un-localized paths, so it is safe to run over an
 * href of unknown provenance — which is exactly what the <Link> wrapper does.
 */
export function localePath(locale, pathname = "/") {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (isUnlocalizedPath(path)) return path;

  const target = normalizeLocale(locale);
  const { rest } = splitLocale(path);
  return rest === "/" ? `/${target}` : `/${target}${rest}`;
}

/** Same path, different language — what the language menu navigates to. */
export function swapLocale(pathname, nextLocale) {
  return localePath(nextLocale, pathname);
}

/**
 * Splits a full href into its path and its query/hash tail, so the tail
 * survives being re-prefixed. Only handles app-relative hrefs; anything
 * external is returned untouched by the caller.
 */
export function localeHref(locale, href) {
  if (typeof href !== "string" || !href.startsWith("/")) return href;
  const tail = href.search(/[?#]/);
  if (tail === -1) return localePath(locale, href);
  return localePath(locale, href.slice(0, tail)) + href.slice(tail);
}

export { DEFAULT_LOCALE, LOCALES };

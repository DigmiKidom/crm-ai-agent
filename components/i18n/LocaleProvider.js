"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_META,
  LOCALES,
  getDir,
  normalizeLocale,
} from "@/lib/i18n/config";
import { localeHref as buildLocaleHref, splitLocale, swapLocale } from "@/lib/i18n/routing";
import { createTranslator } from "@/lib/i18n/translate";

const LocaleContext = createContext(null);

/**
 * Remembers the choice so a visitor landing on an un-prefixed URL (/, /login,
 * a bare bookmark) is sent to the language they last used. It is a *hint for
 * the redirect in proxy.js only* — never a source of truth for what a page
 * renders in. The URL decides that, which is the whole point of this change:
 * one value, visible in the address bar, that the server and the client cannot
 * disagree about.
 */
function writeLocaleCookie(locale) {
  if (typeof document === "undefined") return;
  document.cookie = [
    `${LOCALE_COOKIE}=${encodeURIComponent(locale)}`,
    "Path=/",
    `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
    window.location.protocol === "https:" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function readLocaleCookie() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`));
  return normalizeLocale(match ? decodeURIComponent(match[1]) : DEFAULT_LOCALE);
}

// document.cookie is an external store, so it's read through
// useSyncExternalStore rather than copied into state inside an effect: the
// server snapshot is DEFAULT_LOCALE (matching what it rendered) and the client
// snapshot is the real value, with no intermediate commit in between. Nothing
// emits an event when a cookie changes, so `subscribe` has nothing to attach
// to — cookieVersion below is what re-reads it after *we* write one.
let cookieVersion = 0;
const cookieListeners = new Set();

function subscribeToCookie(onChange) {
  cookieListeners.add(onChange);
  return () => cookieListeners.delete(onChange);
}

function notifyCookieChanged() {
  cookieVersion += 1;
  for (const listener of cookieListeners) listener();
}

let cachedVersion = -1;
let cachedLocale = DEFAULT_LOCALE;

// Must return a referentially stable value between changes, or React re-renders
// forever. The version counter is what makes the cached read safe.
function cookieLocaleSnapshot() {
  if (cachedVersion !== cookieVersion) {
    cachedVersion = cookieVersion;
    cachedLocale = readLocaleCookie();
  }
  return cachedLocale;
}

function serverLocaleSnapshot() {
  return DEFAULT_LOCALE;
}

/**
 * App-wide locale state.
 *
 * Two modes, and the difference is which routes they serve:
 *
 *  - URL-driven (`locale` prop set) — everything under app/(site)/[locale].
 *    The layout already rendered <html lang/dir> from the same value, so there
 *    is nothing to correct after hydration: no layout effect, no pre-paint
 *    script, no window where the server and client disagree. Switching
 *    language is a navigation, not a state update.
 *
 *  - Cookie-driven (`syncFromCookie`) — the public tenant pages, which have no
 *    locale segment because they belong to the tenant's content language, not
 *    the viewer's. Only a couple of chrome strings there depend on the viewer's
 *    UI language, so those resolve after mount and nothing about the page's own
 *    direction depends on the result.
 */
export default function LocaleProvider({ children, locale: localeProp, syncFromCookie = false }) {
  const pathname = usePathname();

  const urlDriven = Boolean(localeProp);
  const cookieLocale = useSyncExternalStore(
    subscribeToCookie,
    urlDriven || !syncFromCookie ? serverLocaleSnapshot : cookieLocaleSnapshot,
    serverLocaleSnapshot
  );

  const locale = urlDriven ? normalizeLocale(localeProp) : cookieLocale;

  const setLocale = useCallback(
    (next) => {
      const target = normalizeLocale(next);
      writeLocaleCookie(target);

      if (!urlDriven) {
        notifyCookieChanged();
        return;
      }
      if (target === locale) return;

      // Same page, other language — as a full document navigation rather than
      // router.push().
      //
      // The locale is a segment of the URL, so switching it re-renders the root
      // layout, and that layout contains the pre-paint theme <script>. React
      // warns loudly about a <script> element re-rendered on the client (it
      // would never execute), and there is no in-tree way to render one that
      // doesn't. A hard navigation sidesteps that, and it is the honest
      // behaviour anyway: changing language changes <html lang>, <html dir> and
      // every server-rendered string on the page — that's a new document, not a
      // patch of the current one.
      //
      // Reading location here rather than with useSearchParams keeps this
      // provider out of the render path for search params, which would
      // otherwise opt every route under it out of static rendering.
      const { search, hash } = window.location;
      window.location.assign(`${swapLocale(pathname || "/", target)}${search}${hash}`);
    },
    [locale, pathname, urlDriven]
  );

  const value = useMemo(() => {
    const meta = LOCALE_META[locale];
    return {
      locale,
      dir: meta.dir,
      isRtl: meta.dir === "rtl",
      meta,
      locales: LOCALES,
      setLocale,
      /** Prefixes an app-relative href with the current locale. */
      href: (target) => buildLocaleHref(locale, target),
      toggleLocale: () => setLocale(LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length]),
      t: createTranslator(locale),
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used inside <LocaleProvider>.");
  }
  return ctx;
}

/** Shorthand for the common case: `const t = useT();` */
export function useT() {
  return useLocale().t;
}

/**
 * `const href = useLocaleHref();` then `router.push(href("/t/acme/leads"))`.
 * For plain markup use the <Link> in this folder instead — it does this for you.
 */
export function useLocaleHref() {
  return useLocale().href;
}

/**
 * The current path with its locale segment removed: "/he/t/acme/leads" ->
 * "/t/acme/leads".
 *
 * Anything comparing the current location against a route — an "is this nav
 * item active?" check, a bare-layout test — has to use this rather than
 * usePathname(), or every one of those comparisons silently becomes false the
 * moment a locale is in front of it.
 */
export function useRoutePath() {
  const pathname = usePathname() || "/";
  return splitLocale(pathname).rest;
}

export { getDir };

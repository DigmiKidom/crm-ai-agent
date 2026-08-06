"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_META,
  LOCALES,
  getDir,
  normalizeLocale,
} from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translate";

const LocaleContext = createContext(null);

// useLayoutEffect warns when React renders on the server. The locale sync
// genuinely needs to run before paint (see below), so on the server it
// degrades to useEffect, which never actually executes there anyway.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readLocaleCookie() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`)
  );
  return normalizeLocale(match ? decodeURIComponent(match[1]) : DEFAULT_LOCALE);
}

function applyDocumentLocale(locale) {
  if (typeof document === "undefined") return;
  const meta = LOCALE_META[normalizeLocale(locale)];
  document.documentElement.lang = meta.htmlLang;
  document.documentElement.dir = meta.dir;
}

/**
 * App-wide locale state.
 *
 * Both the server render and the *first* client render deliberately use
 * DEFAULT_LOCALE so the hydrated tree matches the server HTML exactly — no
 * mismatch warnings, and no `suppressHydrationWarning` papering over real bugs.
 * The real locale is then applied in a layout effect, which React flushes
 * synchronously before the browser paints, so a Hebrew user never sees a frame
 * of English. Text direction itself is set even earlier, by the pre-hydration
 * script in app/layout.js, so the layout never visibly flips.
 */
export default function LocaleProvider({ children, initialLocale }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(() => normalizeLocale(initialLocale));

  useIsomorphicLayoutEffect(() => {
    // `initialLocale` is only passed by server routes that already read the
    // cookie (the dashboard). Everywhere else, the cookie is the source of
    // truth and is read here.
    const actual = initialLocale ? normalizeLocale(initialLocale) : readLocaleCookie();
    applyDocumentLocale(actual);
    setLocaleState((current) => (current === actual ? current : actual));
  }, [initialLocale]);

  const setLocale = useCallback(
    (next) => {
      const target = normalizeLocale(next);

      // `SameSite=Lax` keeps the choice on top-level navigations without
      // exposing it cross-site; it's a display preference, so it stays
      // readable by JS rather than being HttpOnly.
      document.cookie = [
        `${LOCALE_COOKIE}=${encodeURIComponent(target)}`,
        "Path=/",
        `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
        "SameSite=Lax",
        window.location.protocol === "https:" ? "Secure" : "",
      ]
        .filter(Boolean)
        .join("; ");

      applyDocumentLocale(target);
      setLocaleState(target);

      // Server components that translated their own output (dashboard routes)
      // need to re-render against the new cookie.
      router.refresh();
    },
    [router]
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
      // Cycles through every configured locale rather than a hardcoded
      // en/he pair — LanguageToggle uses the full menu (setLocale directly)
      // and doesn't call this, but this stays correct for any future caller.
      toggleLocale: () => {
        const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];
        setLocale(next);
      },
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

export { getDir };

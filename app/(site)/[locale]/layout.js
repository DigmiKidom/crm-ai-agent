import Script from "next/script";
import { notFound } from "next/navigation";
import "../../globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import SiteChrome from "@/components/chrome/SiteChrome";
import SkipLink from "@/components/chrome/SkipLink";
import CookieBanner from "@/components/CookieBanner";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";

/**
 * Root layout for every route whose language is part of its URL: the
 * marketing page, the auth flow, the dashboard and the admin surface.
 *
 * The tenant-facing pages have their own root layout under app/(public) —
 * a landing page is written in the tenant's content language and must not be
 * duplicated across /en, /he and /es.
 */

// Pre-renders /en/*, /he/* and /es/* rather than resolving the segment per
// request. Adding a locale to LOCALES is still the only step needed.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const meta = LOCALE_META[locale];
  if (!meta) return {};

  const base = process.env.APP_URL || undefined;

  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title: {
      default: "Ceramony — Connected to your business",
      template: "%s · Ceramony",
    },
    description:
      "AI-generated landing pages, a CRM that configures itself, and agents that write your copy — built for small businesses.",
    // hreflang, now that each language genuinely has its own URL. Without
    // this a search engine sees three near-identical pages and picks one;
    // with it, it serves the right language to the right visitor.
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((code) => [code, `/${code}`])),
    },
    openGraph: { locale: meta.htmlLang },
  };
}

// Dark mode only. The locale used to be applied here too — reading a cookie
// before hydration so <html dir> was right before first paint — which is
// exactly the fragile part this routing change removes: `dir` now comes from
// the URL segment below, rendered on the server, so there is nothing left to
// patch up in the browser.
const THEME_BOOT = `
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch (e) {}
})();
`;

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const meta = LOCALE_META[locale];

  // proxy.js redirects anything without a valid locale segment, so reaching
  // here with a bad one means a direct hit on a path it doesn't match. 404
  // rather than quietly falling back to English, which would let /fr/login
  // render as a real page under a URL that promises a language it isn't.
  if (!meta) notFound();

  return (
    // `dir` is now server-rendered and correct on the very first byte, so
    // suppressHydrationWarning covers only data-theme, which the script above
    // sets before React sees the document.
    <html lang={meta.htmlLang} dir={meta.dir} suppressHydrationWarning>
      <body>
        <Script id="ceramony-theme-boot" strategy="beforeInteractive">
          {THEME_BOOT}
        </Script>
        <SessionProviderWrapper>
          <LocaleProvider locale={meta.code}>
            <SkipLink />
            <SiteChrome>{children}</SiteChrome>
            <CookieBanner />
          </LocaleProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

import Script from "next/script";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import SiteChrome from "@/components/chrome/SiteChrome";
import SkipLink from "@/components/chrome/SkipLink";
import CookieBanner from "@/components/CookieBanner";
import { LOCALE_META, DEFAULT_LOCALE } from "@/lib/i18n/config";

export const metadata = {
  title: {
    default: "Ceramony — Connected to your business",
    template: "%s · Ceramony",
  },
  description:
    "AI-generated landing pages, a CRM that configures itself, and agents that write your copy — built for small businesses.",
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

// Runs before hydration so the dashboard never flashes light-then-dark. The
// dark tokens themselves are scoped to the dashboard shell (see
// dashboard.module.css), so setting this attribute on <html> here is safe
// even though it's app-wide — it's a no-op outside the dashboard.
//
// It also applies the saved locale's `lang`/`dir`. This has to happen before
// first paint: `dir` drives every `*-inline-start`/`*-inline-end` rule in the
// app, so setting it in an effect would let a Hebrew user see one frame of
// left-to-right layout before it mirrored. Reading the cookie here (rather
// than via cookies() in this layout) also keeps every route statically
// renderable — a dynamic API in the root layout would opt the ISR-cached
// tenant landing pages out of caching.
// Built from LOCALE_META rather than hand-listing locales here, so adding a
// language to lib/i18n/config.js is the only place that needs to change —
// this script (and its dir lookup) pick it up automatically.
const DIR_BY_LOCALE = JSON.stringify(
  Object.fromEntries(Object.values(LOCALE_META).map((m) => [m.code, m.dir]))
);

const BOOT_SCRIPT = `
(function () {
  var d = document.documentElement;
  try {
    if (localStorage.getItem("theme") === "dark") {
      d.setAttribute("data-theme", "dark");
    }
  } catch (e) {}
  try {
    var dirByLocale = ${DIR_BY_LOCALE};
    var m = document.cookie.match(/(?:^|;\\s*)ceramony_locale=([^;]*)/);
    var loc = m ? decodeURIComponent(m[1]) : "${DEFAULT_LOCALE}";
    if (!Object.prototype.hasOwnProperty.call(dirByLocale, loc)) loc = "${DEFAULT_LOCALE}";
    d.lang = loc;
    d.dir = dirByLocale[loc];
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    // These two attributes are corrected by BOOT_SCRIPT before paint, so the
    // server value is intentionally a default rather than the user's real
    // locale — suppressHydrationWarning acknowledges that mismatch is expected
    // here, and it does not extend to any descendant.
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body>
        <Script id="ceramony-boot" strategy="beforeInteractive">
          {BOOT_SCRIPT}
        </Script>
        <SessionProviderWrapper>
          <LocaleProvider>
            <SkipLink />
            <SiteChrome>{children}</SiteChrome>
            <CookieBanner />
          </LocaleProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

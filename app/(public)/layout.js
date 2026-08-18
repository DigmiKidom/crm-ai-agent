import "../globals.css";

/**
 * Root layout for the tenant-facing pages: a customer's landing page
 * (/pages/<slug>), their public CV links, and the same landing page served on
 * their own custom domain.
 *
 * These deliberately have no locale segment. The language of a landing page is
 * a property of the *tenant's content* (lib/i18n/languages.js), not of whoever
 * is looking at it — a Hebrew business's page renders Hebrew and RTL for an
 * English-speaking visitor. Each page therefore sets its own `dir` on its
 * outermost element (see TenantLandingView); the document-level values here
 * are neutral defaults, and nothing on this side of the app reads a cookie or
 * a header, which is what keeps `revalidate = 60` genuinely cacheable.
 */

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

const THEME_BOOT = `
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch (e) {}
})();
`;

export default function PublicLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* See the note in app/(site)/[locale]/layout.js — inline, in <head>,
            so the saved theme is applied before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

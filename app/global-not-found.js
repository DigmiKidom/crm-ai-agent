import { headers } from "next/headers";
import NotFoundView from "@/components/chrome/NotFoundView";
import { DEFAULT_LOCALE, LOCALE_META, normalizeLocale } from "@/lib/i18n/config";
import "./globals.css";

/**
 * The 404, for the whole app.
 *
 * It owns the entire document — <html> and all — rather than being a
 * not-found.js boundary, because Next 16 renders a 404 detached from the root
 * layout: a plain not-found.js gets no <html>, and therefore no `lang`, no
 * `dir` and no global stylesheet. For an English visitor that's cosmetic; for
 * a Hebrew one it means the single page someone sees when they're already lost
 * is the only page in the app laid out left-to-right. (Enabled by
 * `experimental.globalNotFound` in next.config.mjs. A not-found.js anywhere in
 * the tree would take precedence over this file, so there deliberately isn't
 * one.)
 *
 * The locale comes from the `x-locale` header proxy.js sets on every request
 * it handles, derived from the URL's own locale segment — so a 404 under /he
 * is Hebrew and right-to-left, one under /es is Spanish, and no cookie is
 * consulted to decide it.
 *
 * This is also what an unauthorized visitor to /admin sees: the proxy rewrites
 * here rather than redirecting to /login, so probing for the admin surface
 * returns exactly what probing for any nonexistent URL returns. That
 * equivalence is the point — this page must stay indistinguishable from a
 * genuine 404, which is why it says nothing about accounts, permissions, or
 * signing in.
 */
export const metadata = { title: "Page not found" };

export default async function GlobalNotFound() {
  const store = await headers();
  const locale = normalizeLocale(store.get("x-locale") || DEFAULT_LOCALE);
  const meta = LOCALE_META[locale];

  return (
    <html lang={meta.htmlLang} dir={meta.dir}>
      <body>
        <NotFoundView locale={locale} />
      </body>
    </html>
  );
}

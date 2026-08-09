import { translate } from "@/lib/i18n/translate";

/**
 * The suspension notice, as a complete standalone HTML document.
 *
 * Built as a string rather than a React page for one reason: it has to be
 * served with HTTP 451, and the App Router gives a page component no way to
 * set a response status — only notFound()'s 404. A route handler can return
 * any status, but can't render CSS modules, so this document carries its own
 * styles inline. It's a terminal page with no interactivity and nothing to
 * share with the rest of the app, so that isolation costs nothing.
 *
 * 451 ("Unavailable For Legal Reasons") is the honest code here: the page
 * exists and we removed it. A 404 would claim it never existed; a 403 would
 * imply something about this particular visitor.
 *
 * Deliberately carries no trace of the suspended page — no business name, no
 * headline, no logo, no brand colours. A takedown notice that still renders
 * the offending brand is still hosting it.
 */
export function suspendedNoticeHtml(locale = "en") {
  const t = (key) => translate(locale, key);
  const dir = locale === "he" ? "rtl" : "ltr";
  const escape = (value) =>
    String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  return `<!DOCTYPE html>
<html lang="${escape(locale)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escape(t("suspended.title"))}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    background: #f8fafc;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  }
  .card {
    box-sizing: border-box;
    max-width: 480px;
    width: 100%;
    padding: 40px 32px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    text-align: center;
  }
  h1 { margin: 0 0 14px; font-size: 1.35rem; font-weight: 650; letter-spacing: -0.02em; }
  p { margin: 0 0 12px; line-height: 1.65; color: #475569; }
  .meta { font-size: 0.85rem; color: #94a3b8; }
  .mark { font-size: 0.8rem; letter-spacing: 0.14em; text-transform: uppercase; color: #cbd5e1; margin-bottom: 18px; }
  a {
    display: inline-block;
    margin-top: 10px;
    padding: 9px 18px;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    color: #475569;
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none;
  }
  a:hover { border-color: #94a3b8; color: #0f172a; }
</style>
</head>
<body>
  <main class="card">
    <div class="mark">Ceramony</div>
    <h1>${escape(t("suspended.title"))}</h1>
    <p>${escape(t("suspended.body"))}</p>
    <p class="meta">${escape(t("suspended.ownerNote"))}</p>
    <a href="/terms">${escape(t("suspended.readTerms"))}</a>
  </main>
</body>
</html>`;
}

import { getServerLocale } from "@/lib/i18n/server";
import { suspendedNoticeHtml } from "@/lib/suspendedNotice";

/**
 * The suspension notice, served with HTTP 451.
 *
 * A route handler rather than a page because only a route handler can set the
 * status code — see lib/suspendedNotice.js. Every blocked landing page
 * (/pages/[slug], /l/[slug], and a tenant's own custom domain) redirects here,
 * so there's one notice and one status code regardless of how the visitor
 * arrived.
 */
export async function GET() {
  const locale = await getServerLocale();

  return new Response(suspendedNoticeHtml(locale), {
    // 451 Unavailable For Legal Reasons.
    status: 451,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Never cached: a page unblocked after review must come back
      // immediately, not after an intermediary's TTL expires.
      "Cache-Control": "no-store, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

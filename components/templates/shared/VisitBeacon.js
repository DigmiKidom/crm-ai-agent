"use client";

import { useEffect } from "react";

/**
 * Fires once per page view, client-side only — the public landing page is
 * ISR-cached (identical HTML for every visitor), so there's no per-request
 * server hook to count a visit from; this beacon is the substitute. Rendered
 * once from app/pages/[tenantSlug]/page.js rather than inside each of the 4
 * templates, so it isn't duplicated per template.
 *
 * `sendBeacon` (not `fetch`) is what makes this safe to fire-and-forget: the
 * browser guarantees the request is sent even if the visitor navigates away
 * immediately, without this component needing to await anything or block
 * rendering.
 */
export default function VisitBeacon({ tenantSlug }) {
  useEffect(() => {
    const payload = JSON.stringify({ tenantSlug });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } else {
      // Old-browser fallback — keepalive lets the request outlive a page
      // unload the same way sendBeacon does natively.
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [tenantSlug]);

  return null;
}

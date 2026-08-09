"use client";

/**
 * The hero CTA button, wrapped just enough to fire a click-through beacon —
 * everything else (styling, href, the "#lead-form" anchor jump) behaves
 * exactly like the plain `<a>` this replaces. No preventDefault: the click
 * beacon is fire-and-forget alongside the default navigation, never gating it.
 *
 * Needs its own Client Component boundary because the 4 templates that
 * render this are Server Components — a plain onClick can't live on an
 * element inside one of those.
 */
export default function CtaLink({ tenantSlug, href, className, children }) {
  function handleClick() {
    const payload = JSON.stringify({ tenantSlug, type: "cta_click" });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}

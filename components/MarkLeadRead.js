"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Renders nothing. Marks a lead read once on mount, then refreshes the router
 * so the unread badge in the sidebar layout recounts.
 *
 * This lives on the client rather than in the page's server render because
 * revalidating a layout isn't allowed mid-render, and a soft client navigation
 * wouldn't re-run the layout anyway — the badge would go stale until a reload.
 */
export default function MarkLeadRead({ leadId }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    // React 18+ mounts effects twice in dev StrictMode; one PATCH is plenty.
    if (done.current) return;
    done.current = true;

    let cancelled = false;

    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    })
      .then((res) => {
        if (res.ok && !cancelled) router.refresh();
      })
      .catch(() => {
        // Failing to clear the dot is cosmetic — never surface it to the user.
      });

    return () => {
      cancelled = true;
    };
  }, [leadId, router]);

  return null;
}

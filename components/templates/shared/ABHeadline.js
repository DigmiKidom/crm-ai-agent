"use client";

import { useEffect, useState } from "react";
import { getOrAssignHeadlineVariant } from "@/lib/abTest";

// Drop-in replacement for a plain `<h1>{headline}</h1>` in each template's
// hero section. When `headlineB` is empty (the default — no test running for
// this tenant), this renders exactly what it always did: `headlineA`, once,
// no cookie ever touched. Only once a tenant fills in a second headline in
// the landing-page editor does this start assigning/reading the A/B cookie.
export default function ABHeadline({ tenantSlug, headlineA, headlineB, className }) {
  const [text, setText] = useState(headlineA);

  useEffect(() => {
    if (!headlineB) return;
    const variant = getOrAssignHeadlineVariant(tenantSlug);
    // Deliberate exception: this can't be a useState initializer instead,
    // because document.cookie doesn't exist during SSR/first paint — reading
    // it necessarily happens post-mount, which is exactly the trade-off
    // documented above (a brief flash for a "b" visitor, unchanged
    // performance for everyone else).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (variant === "b") setText(headlineB);
  }, [tenantSlug, headlineB]);

  return <h1 className={className}>{text}</h1>;
}

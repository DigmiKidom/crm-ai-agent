"use client";

import { useEffect, useState } from "react";
import { IconCookie, IconClose } from "./icons";
import styles from "./CookieBanner.module.css";

const STORAGE_KEY = "cookie-consent";

// Site-wide, not dashboard-only: this needs to show on the public landing
// pages and the pre-login auth screens too, since that's where a first-time
// visitor actually lands. Rendered from the root layout for that reason.
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // One-time read of a prior choice already sitting in localStorage — see
    // the same pattern (and rationale) in ThemeToggle.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(localStorage.getItem(STORAGE_KEY) !== "accepted");
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function dismiss() {
    // Closes for this visit without recording consent, so it reappears next
    // time — distinct from "Got it", which is a real acknowledgement.
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className={styles.wrap} role="dialog" aria-label="Cookie notice">
      <IconCookie size={22} className={styles.icon} />
      <p className={styles.text}>
        <strong>We use cookies.</strong> Just the essential kind — to keep you signed in and
        remember your preferences. No tracking, no third-party ads.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.accept} onClick={accept}>
          Got it
        </button>
        <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss">
          <IconClose size={16} />
        </button>
      </div>
    </div>
  );
}

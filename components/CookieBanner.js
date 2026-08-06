"use client";

import { useEffect, useState } from "react";
import { IconCookie, IconClose } from "./icons";
import styles from "./CookieBanner.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

const STORAGE_KEY = "cookie-consent";

// Site-wide, not dashboard-only: this needs to show on the public landing
// pages and the pre-login auth screens too, since that's where a first-time
// visitor actually lands. Rendered from the root layout for that reason.
export default function CookieBanner() {
  const t = useT();
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
    <div className={styles.wrap} role="dialog" aria-label={t("cookies.notice")}>
      <IconCookie size={22} className={styles.icon} />
      <p className={styles.text}>
        <strong>{t("cookies.headline")}</strong> {t("cookies.body")}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.accept} onClick={accept}>
          {t("cookies.gotIt")}
        </button>
        <button type="button" className={styles.dismiss} onClick={dismiss} aria-label={t("cookies.dismiss")}>
          <IconClose size={16} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./chrome.module.css";

/**
 * Standard "skip to main content" pattern: invisible until it receives
 * keyboard focus (the very first Tab stop on every page), then jumps past
 * the header/sidebar nav straight to `#main-content` — set on the `<main>`
 * in both SiteChrome (marketing/auth pages) and DashboardShell (the CRM).
 * A mouse user never sees it; a keyboard user no longer has to tab through
 * the full nav on every single page load to reach the actual content.
 */
export default function SkipLink() {
  const t = useT();
  return (
    <a href="#main-content" className={styles.skipLink}>
      {t("nav.skipToContent")}
    </a>
  );
}

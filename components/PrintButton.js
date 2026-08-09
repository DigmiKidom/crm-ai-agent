"use client";

import { IconFileText } from "@/components/icons";
import styles from "./dashboard.module.css";

/**
 * "Save as PDF", via the browser's own print dialog.
 *
 * The same approach the CV builder takes: the page you're looking at is the
 * page that prints (print rules hide the filters and chrome), so there's no
 * second layout to keep in sync and no PDF library in the bundle. Every
 * browser's print dialog offers "Save as PDF".
 */
export default function PrintButton({ label }) {
  return (
    <button
      type="button"
      className={`${styles.linkButton} ${styles.iconLabel} ${styles.noPrint}`}
      onClick={() => window.print()}
    >
      <IconFileText size={13} />
      {label}
    </button>
  );
}

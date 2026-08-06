"use client";

import { useState } from "react";
import { IconArrowRight } from "@/components/icons";
import styles from "./tutorial.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

// The condensed "short book" version — same ground as the full guide, folded
// into 3 pages for anyone who'd rather skim than step through 5 screens.
// The condensed "short book" version — same ground as the full guide, folded
// into 3 pages for anyone who'd rather skim than step through 5 screens.
// Body paragraphs are reused from the full tutorial's keys.
const PAGES = [
  { key: "q1", bodyKeys: ["tutorial.s2a"] },
  { key: "q2", bodyKeys: ["tutorial.s3a", "tutorial.s4a"] },
  { key: "q3", bodyKeys: ["tutorial.s5a"] },
];

export default function QuickTutorial({ tenantSlug }) {
  const t = useT();
  const [page, setPage] = useState(0);
  const isLast = page === PAGES.length - 1;
  const current = PAGES[page];

  return (
    <div className={styles.quickCard}>
      <div className={styles.quickPage}>
        <span className={styles.quickPageNumber}>
          Page {page + 1} of {PAGES.length}
        </span>
        <h2 className={styles.quickPageTitle}>{t(`tutorial.${current.key}t`)}</h2>
        <div className={styles.quickPageBody}>
          {current.bodyKeys.map((k) => (
            <p key={k}>{t(k)}</p>
          ))}
        </div>
      </div>

      <div className={styles.quickDots} aria-hidden="true">
        {PAGES.map((p, i) => (
          <span key={p.key} className={i === page ? styles.quickDotActive : styles.quickDot} />
        ))}
      </div>

      <div className={styles.stepFooter}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <IconArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> Back
        </button>
        {isLast ? (
          <a href={`/t/${tenantSlug}`} className={`${styles.navButton} ${styles.navButtonPrimary}`}>
            Go to my dashboard <IconArrowRight size={14} />
          </a>
        ) : (
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonPrimary}`}
            onClick={() => setPage((p) => Math.min(PAGES.length - 1, p + 1))}
          >
            Next <IconArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

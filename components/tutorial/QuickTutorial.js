"use client";

import { useState } from "react";
import { IconArrowRight } from "@/components/icons";
import styles from "./tutorial.module.css";

// The condensed "short book" version — same ground as the full guide, folded
// into 3 pages for anyone who'd rather skim than step through 5 screens.
const PAGES = [
  {
    title: "AI builds your starting point",
    body: (
      <>
        <p>
          Describe your business once and the AI setup writes your company profile and picks a
          landing page layout for you — pick from 4 templates, adjust the grid, and add up to 6
          gallery photos whenever you like.
        </p>
      </>
    ),
  },
  {
    title: "Leads and notes, organized",
    body: (
      <>
        <p>
          Every form submission on your landing page lands straight in your Leads inbox and
          pipeline board — no setup required.
        </p>
        <p>
          The Workplace section in your sidebar is yours: create documents for notes, or tables
          with typed columns for anything else you need to track.
        </p>
      </>
    ),
  },
  {
    title: "Track what's working",
    body: (
      <p>
        Analytics shows where your leads come from and how your pipeline is moving, so you always
        know what to focus on next.
      </p>
    ),
  },
];

export default function QuickTutorial({ tenantSlug }) {
  const [page, setPage] = useState(0);
  const isLast = page === PAGES.length - 1;
  const current = PAGES[page];

  return (
    <div className={styles.quickCard}>
      <div className={styles.quickPage}>
        <span className={styles.quickPageNumber}>
          Page {page + 1} of {PAGES.length}
        </span>
        <h2 className={styles.quickPageTitle}>{current.title}</h2>
        <div className={styles.quickPageBody}>{current.body}</div>
      </div>

      <div className={styles.quickDots} aria-hidden="true">
        {PAGES.map((p, i) => (
          <span key={p.title} className={i === page ? styles.quickDotActive : styles.quickDot} />
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

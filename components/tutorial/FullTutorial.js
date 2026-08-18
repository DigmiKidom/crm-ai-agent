"use client";

import { useState } from "react";
import {
  IconArrowRight,
  IconChart,
  IconDocument,
  IconInbox,
  IconSparkles,
  IconTable,
} from "@/components/icons";
import styles from "./tutorial.module.css";
import { useT } from "@/components/i18n/LocaleProvider";
import Link from "@/components/i18n/Link";

// Descriptors only — every string resolves through t() at render time, so the
// tutorial follows the dashboard language like the rest of the app.
const STEPS = [
  { key: "s1", icon: IconSparkles, paragraphs: 2 },
  { key: "s2", icon: IconChart, image: "/tutorial/landing-preview.png", paragraphs: 1 },
  { key: "s3", icon: IconInbox, image: "/tutorial/dashboard-preview.png", paragraphs: 1 },
  {
    key: "s4",
    paragraphs: 1,
    icons: [
      { icon: IconDocument, labelKey: "tutorial.documents" },
      { icon: IconTable, labelKey: "tutorial.tables" },
    ],
  },
  { key: "s5", icon: IconChart, paragraphs: 1 },
];

export default function FullTutorial({ tenantSlug }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  const isLast = active === STEPS.length - 1;

  return (
    <div className={styles.guide}>
      <nav className={styles.stepNav} aria-label={t("tutorial.steps")}>
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className={`${styles.stepNavItem} ${i === active ? styles.stepNavItemActive : ""} ${
              i < active ? styles.stepNavItemDone : ""
            }`}
            onClick={() => setActive(i)}
          >
            <span className={styles.stepDot}>{i + 1}</span>
            {t(`tutorial.${s.key}t`)}
          </button>
        ))}
      </nav>

      <div className={styles.step}>
        <span className={styles.stepEyebrow}>{t("tutorial.stepN", { n: active + 1 })}</span>
        <h2 className={styles.stepTitle}>{t(`tutorial.${step.key}t`)}</h2>
        <div className={styles.stepBody}>
          {Array.from({ length: step.paragraphs }, (_, i) => (
            <p key={i}>{t(`tutorial.${step.key}${String.fromCharCode(97 + i)}`)}</p>
          ))}
        </div>

        {step.image && (
          <div className={styles.stepImageWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.image} alt="" className={styles.stepImage} />
          </div>
        )}

        {step.icons && (
          <div className={styles.stepIconRow}>
            {step.icons.map(({ icon: Icon, label }) => (
              <div className={styles.stepIconCard} key={label}>
                <Icon size={20} />
                {label}
              </div>
            ))}
          </div>
        )}

        <div className={styles.stepFooter}>
          <span className={styles.stepFooterNote}>
            {active + 1} of {STEPS.length}
          </span>
          <div className={styles.navButtons}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setActive((a) => Math.max(0, a - 1))}
              disabled={active === 0}
            >
              <IconArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> Back
            </button>
            {isLast ? (
              <Link href={`/t/${tenantSlug}`} className={`${styles.navButton} ${styles.navButtonPrimary}`}>
                Go to my dashboard <IconArrowRight size={14} />
              </Link>
            ) : (
              <button
                type="button"
                className={`${styles.navButton} ${styles.navButtonPrimary}`}
                onClick={() => setActive((a) => Math.min(STEPS.length - 1, a + 1))}
              >
                Next <IconArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

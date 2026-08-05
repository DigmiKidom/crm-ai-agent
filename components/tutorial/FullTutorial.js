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

const STEPS = [
  {
    title: "Set up with AI",
    eyebrow: "Step 1",
    body: (
      <>
        <p>
          When you first sign up, describe your business in a sentence or two. The AI setup
          fills in your company profile, writes starter copy, and picks a landing page layout —
          you&apos;re not starting from a blank page.
        </p>
        <p>Everything it generates is editable afterwards, so it&apos;s a starting point, not a lock-in.</p>
      </>
    ),
    icon: IconSparkles,
  },
  {
    title: "Customize your landing page",
    eyebrow: "Step 2",
    body: (
      <p>
        Pick from four layouts, choose your grid and column style, and add up to six photos to
        your gallery. Your brand colors and fonts carry across the whole page automatically.
      </p>
    ),
    image: "/tutorial/landing-preview.png",
    icon: IconChart,
  },
  {
    title: "Every lead lands in one place",
    eyebrow: "Step 3",
    body: (
      <p>
        Visitors who fill out your landing page form show up instantly in your Leads inbox and
        your pipeline board. Nothing to connect, nothing to configure — it just works the moment
        your page goes live.
      </p>
    ),
    image: "/tutorial/dashboard-preview.png",
    icon: IconInbox,
  },
  {
    title: "Keep your own notes and lists",
    eyebrow: "Step 4",
    body: (
      <p>
        The Workplace section in your sidebar is yours to shape: create documents for notes and
        plans, or tables with typed columns for anything you want to track — supplier lists,
        follow-ups, pricing, whatever your business needs.
      </p>
    ),
    icons: [
      { icon: IconDocument, label: "Documents" },
      { icon: IconTable, label: "Tables" },
    ],
  },
  {
    title: "See what's working",
    eyebrow: "Step 5",
    body: (
      <p>
        Analytics shows where your leads come from, how your pipeline is moving, and which parts
        of your page get the most attention — so you know what to double down on.
      </p>
    ),
    icon: IconChart,
  },
];

export default function FullTutorial({ tenantSlug }) {
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  const isLast = active === STEPS.length - 1;

  return (
    <div className={styles.guide}>
      <nav className={styles.stepNav} aria-label="Tutorial steps">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            className={`${styles.stepNavItem} ${i === active ? styles.stepNavItemActive : ""} ${
              i < active ? styles.stepNavItemDone : ""
            }`}
            onClick={() => setActive(i)}
          >
            <span className={styles.stepDot}>{i + 1}</span>
            {s.title}
          </button>
        ))}
      </nav>

      <div className={styles.step}>
        <span className={styles.stepEyebrow}>{step.eyebrow}</span>
        <h2 className={styles.stepTitle}>{step.title}</h2>
        <div className={styles.stepBody}>{step.body}</div>

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
              <a href={`/t/${tenantSlug}`} className={`${styles.navButton} ${styles.navButtonPrimary}`}>
                Go to my dashboard <IconArrowRight size={14} />
              </a>
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

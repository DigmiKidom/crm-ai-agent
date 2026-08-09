import styles from "./shared.module.css";

/**
 * FAQ accordion.
 *
 * Built on <details>/<summary> rather than useState, which means it works
 * with no JavaScript at all, is keyboard-operable and screen-reader-announced
 * for free, and lets this stay a server component inside an ISR-cached page.
 *
 * Deliberately undecorated beyond the tenant's own brand colour — like
 * TeamSection, this is shared chrome that has to sit convincingly inside all
 * four templates.
 */
export default function FaqSection({ items = [], heading, className }) {
  if (!items.length) return null;

  return (
    <section className={`${styles.faqSection} ${className || ""}`}>
      <h2>{heading}</h2>
      <div className={styles.faqList}>
        {items.map((item, i) => (
          <details key={i} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>{item.question}</span>
              {/* Rotates when the entry opens — see .faqItem[open] in
                  shared.module.css. Decorative, so it carries no label. */}
              <svg
                className={styles.faqChevron}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

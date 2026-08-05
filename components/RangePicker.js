import { RANGES, RANGE_KEYS } from "@/lib/analytics";
import styles from "./analytics.module.css";

/**
 * Week / Month / Year / 3 years selector.
 *
 * Plain links with a `range` query param rather than client state — same
 * approach as the leads inbox filters, so a particular view is bookmarkable,
 * shareable, and survives a refresh, and the page stays a server component.
 */
export default function RangePicker({ basePath, active }) {
  return (
    <nav className={styles.rangePicker} aria-label="Time range">
      {RANGE_KEYS.map((key) => {
        const range = RANGES[key];
        const isActive = key === active;
        return (
          <a
            key={key}
            href={`${basePath}?range=${key}`}
            className={`${styles.rangeOption} ${isActive ? styles.rangeOptionActive : ""}`}
            title={range.caption}
            aria-current={isActive ? "page" : undefined}
          >
            {range.label}
          </a>
        );
      })}
    </nav>
  );
}

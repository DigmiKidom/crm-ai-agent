import { RANGES, RANGE_KEYS } from "@/lib/analytics";
import styles from "./analytics.module.css";

/**
 * Week / Month / Year / 3 years selector.
 *
 * Plain links with a `range` query param rather than client state — same
 * approach as the leads inbox filters, so a particular view is bookmarkable,
 * shareable, and survives a refresh, and the page stays a server component.
 *
 * `t` arrives as a prop rather than from useT(): this renders on the server,
 * where there is no React context to read. The analytics page already has a
 * translator from getServerT(), and passing it down keeps this component off
 * the client bundle entirely.
 */
export default function RangePicker({ basePath, active, t }) {
  return (
    <nav className={styles.rangePicker} aria-label={t("range.label")}>
      {RANGE_KEYS.map((key) => {
        const range = RANGES[key];
        const isActive = key === active;
        return (
          <a
            key={key}
            href={`${basePath}?range=${key}`}
            className={`${styles.rangeOption} ${isActive ? styles.rangeOptionActive : ""}`}
            title={t(`analytics.range.${key}Caption`)}
            aria-current={isActive ? "page" : undefined}
          >
            {t(`analytics.range.${key}`)}
          </a>
        );
      })}
    </nav>
  );
}

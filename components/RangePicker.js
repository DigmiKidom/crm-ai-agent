import { RANGES, RANGE_KEYS, PRO_ONLY_RANGES } from "@/lib/analytics";
import { IconLock } from "./icons";
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
 *
 * `isPro` gates the longer windows (see lib/analytics.js's PRO_ONLY_RANGES) —
 * this is only the *hint*: a locked option links to Settings instead of the
 * range itself, but the real enforcement is server-side, in the analytics
 * page, since a link can always be bypassed by hand-editing the URL.
 */
export default function RangePicker({ basePath, active, t, isPro, settingsPath }) {
  return (
    <nav className={styles.rangePicker} aria-label={t("range.label")}>
      {RANGE_KEYS.map((key) => {
        const isActive = key === active;
        const locked = !isPro && PRO_ONLY_RANGES.includes(key);

        return (
          <a
            key={key}
            href={locked ? settingsPath : `${basePath}?range=${key}`}
            className={`${styles.rangeOption} ${isActive ? styles.rangeOptionActive : ""} ${
              locked ? styles.rangeOptionLocked : ""
            }`}
            title={locked ? t("analytics.range.proOnly") : t(`analytics.range.${key}Caption`)}
            aria-current={isActive ? "page" : undefined}
          >
            {t(`analytics.range.${key}`)}
            {locked && <IconLock size={11} className={styles.rangeOptionLockIcon} />}
          </a>
        );
      })}
    </nav>
  );
}

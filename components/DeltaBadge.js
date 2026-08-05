import { IconTrendUp, IconTrendDown } from "@/components/icons";
import styles from "./analytics.module.css";

/**
 * "+23%" / "−12%" pill comparing a metric to the previous window.
 *
 * `value` is a signed percentage, or null meaning "there was nothing to compare
 * against" — that renders as "New" rather than an infinite increase, which is
 * what a naive percentage change would produce when the previous period was
 * empty.
 *
 * Callers that measure something where lower is better (response time) flip the
 * sign before passing it in, so up is always good here.
 */
export default function DeltaBadge({ value, suffix = "%" }) {
  if (value === undefined) return null;

  if (value === null) {
    return <span className={`${styles.kpiDelta} ${styles.deltaNew}`}>New</span>;
  }

  if (value === 0) {
    return <span className={`${styles.kpiDelta} ${styles.deltaFlat}`}>No change</span>;
  }

  const up = value > 0;
  const Icon = up ? IconTrendUp : IconTrendDown;

  return (
    <span className={`${styles.kpiDelta} ${up ? styles.deltaUp : styles.deltaDown}`}>
      <Icon size={12} strokeWidth={2.25} />
      {up ? "+" : "−"}
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

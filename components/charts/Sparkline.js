import styles from "./charts.module.css";

/**
 * Tiny trend line for KPI cards — no axes, no labels, no interaction. Its whole
 * job is to say "shape of the last N buckets" in the space beside a number.
 *
 * Server component: nothing here is interactive.
 */
export default function Sparkline({ values = [], width = 80, height = 24, filled = true }) {
  const points = values.filter((v) => typeof v === "number");
  // One point has no shape to draw, so don't render a misleading flat line.
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  // A flat series would divide by zero; pin it to the vertical middle instead.
  const span = max - min || 1;

  const x = (i) => (i / (points.length - 1)) * width;
  const y = (v) => height - ((v - min) / span) * (height - 2) - 1;

  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`).join(" ");

  return (
    <svg
      className={styles.sparkline}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {filled && <path className={styles.sparkFill} d={`${line} L${width} ${height} L0 ${height} Z`} />}
      <path className={styles.sparkLine} d={line} />
    </svg>
  );
}

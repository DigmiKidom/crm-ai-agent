import styles from "./charts.module.css";

/**
 * Horizontal bars with a label column — the right shape whenever categories
 * have long names (response-time bands, traffic sources, form fields) that
 * would overlap on a vertical axis.
 *
 * Plain divs rather than SVG: there's no axis, no tooltip and no interaction
 * here, so an SVG would only make it harder to keep the text legible.
 *
 * `mode="share"` scales bars against 100% (each row is a percentage of the
 * whole); `mode="max"` scales against the largest row, which reads better when
 * the absolute numbers are small.
 */
export default function HBarList({
  rows = [],
  mode = "max",
  showShare = true,
  suffix = "",
  emptyMessage = "Nothing to show yet.",
}) {
  const usable = rows.filter(Boolean);
  if (!usable.length) return <div className={styles.empty}>{emptyMessage}</div>;

  const max = Math.max(1, ...usable.map((r) => r.value || 0));

  return (
    <div className={styles.hbarList}>
      {usable.map((row, i) => {
        const width =
          mode === "share"
            ? Math.min(100, row.share ?? 0)
            : ((row.value || 0) / max) * 100;

        const color = row.muted
          ? "var(--muted)"
          : row.urgent
            ? "#f59e0b"
            : row.kind === "won"
              ? "#16a34a"
              : row.kind === "lost"
                ? "#dc2626"
                : "var(--primary)";

        return (
          <div className={styles.hbarRow} key={`${row.label}-${i}`}>
            <span className={styles.hbarLabel} title={row.label}>
              {row.label}
            </span>
            <span className={styles.hbarTrack}>
              <span
                className={styles.hbarFill}
                style={{
                  // Anything above zero keeps a visible sliver so a row with
                  // one item doesn't look identical to a row with none.
                  width: `${row.value > 0 ? Math.max(width, 2) : 0}%`,
                  background: color,
                  opacity: row.muted ? 0.45 : 1,
                }}
              />
            </span>
            <span className={styles.hbarValue}>
              {row.value}
              {suffix}
              {showShare && row.share != null && (
                <span className={styles.hbarShare}> · {row.share}%</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

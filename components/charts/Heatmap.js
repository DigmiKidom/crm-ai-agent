import styles from "./charts.module.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Five steps of the brand blue rather than a continuous scale: with the lead
// volumes a small business actually sees, a continuous ramp turns everything
// into indistinguishable pale blue. Discrete buckets keep "one lead" and
// "five leads" visibly different.
const STEPS = [
  "var(--border)",
  "rgba(37, 99, 235, 0.22)",
  "rgba(37, 99, 235, 0.45)",
  "rgba(37, 99, 235, 0.7)",
  "rgba(37, 99, 235, 1)",
];

/**
 * 7x24 grid of lead arrivals — weekday down, hour across.
 *
 * `grid` is [7][24] of counts, exactly as lib/analytics.js builds it.
 * Server component: it's a static grid with native `title` tooltips, so there's
 * no reason to ship it to the client.
 */
export default function Heatmap({ grid, emptyMessage = "No leads in this period yet." }) {
  const flat = grid?.flat() ?? [];
  const max = Math.max(0, ...flat);

  if (!max) return <div className={styles.empty}>{emptyMessage}</div>;

  const colorFor = (count) => {
    if (!count) return STEPS[0];
    // Bucket 1..max into the four non-empty steps.
    const idx = Math.min(STEPS.length - 1, Math.ceil((count / max) * (STEPS.length - 1)));
    return STEPS[idx];
  };

  return (
    <div>
      <div className={styles.heatmap}>
        {grid.map((row, day) => (
          <div key={WEEKDAYS[day]} style={{ display: "contents" }}>
            <span className={styles.heatRowLabel}>{WEEKDAYS[day]}</span>
            <div className={styles.heatRow}>
              {row.map((count, hour) => (
                <span
                  key={hour}
                  className={styles.heatCell}
                  style={{ background: colorFor(count) }}
                  title={`${WEEKDAYS[day]} ${String(hour).padStart(2, "0")}:00 — ${count} ${
                    count === 1 ? "lead" : "leads"
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.heatHours}>
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className={styles.heatHour}>
            {/* Every third hour only — 24 labels in this space is unreadable. */}
            {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
          </span>
        ))}
      </div>

      <div className={styles.heatScale}>
        <span>Less</span>
        {STEPS.map((c) => (
          <span key={c} className={styles.heatScaleSwatch} style={{ background: c }} />
        ))}
        <span>More</span>
        <span style={{ marginLeft: "auto" }}>Peak: {max} in one hour</span>
      </div>
    </div>
  );
}

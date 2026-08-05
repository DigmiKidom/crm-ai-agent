import styles from "./charts.module.css";

/**
 * Stage-by-stage bars, widest first, in pipeline order.
 *
 * Deliberately *not* called a funnel in the UI: a lead lives in exactly one
 * stage and the CRM stores no stage-change history, so this shows where leads
 * are sitting right now, not how many passed through each stage. Bars are
 * scaled against the largest stage so a lopsided pipeline is still readable.
 */
export default function FunnelBars({ stages = [], emptyMessage = "No leads in this period yet." }) {
  const total = stages.reduce((sum, s) => sum + (s.value || 0), 0);
  if (!total) return <div className={styles.empty}>{emptyMessage}</div>;

  const max = Math.max(1, ...stages.map((s) => s.value || 0));

  return (
    <div className={styles.funnel}>
      {stages.map((stage, i) => {
        const width = ((stage.value || 0) / max) * 100;
        const barClass = [
          styles.funnelBar,
          stage.kind === "won" ? styles.funnelBarWon : "",
          stage.kind === "lost" ? styles.funnelBarLost : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div className={styles.funnelRow} key={`${stage.label}-${i}`}>
            <span className={styles.funnelLabel} title={stage.label}>
              {stage.label}
            </span>
            <div className={styles.funnelBarWrap}>
              <span
                className={barClass}
                style={{ width: `${stage.value > 0 ? Math.max(width, 1.5) : 0}%` }}
              />
              <span className={styles.funnelCount}>
                {stage.value}
                <span className={styles.funnelShare}> · {stage.share ?? 0}%</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import styles from "./charts.module.css";
import { niceMax } from "./TimeSeriesChart";

const VIEW_W = 720;
const VIEW_H = 200;
const PAD = { top: 12, right: 10, bottom: 26, left: 38 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

/**
 * Vertical bars over a categorical axis — used for the hour-of-day and
 * day-of-week distributions, where a line chart would imply a continuity
 * between categories that isn't there.
 *
 * `points` is [{ label, value, kind? }]; `kind` picks the bar colour so won /
 * lost / urgent series read at a glance without a legend.
 */
// See TimeSeriesChart: `unit` is a string, not a formatter, because server
// components can't pass functions to client components.
export default function BarChart({
  points = [],
  unit = "",
  valueLabel = "leads",
  emptyMessage = "No data in this period yet.",
  highlightIndex = null,
}) {
  const [hover, setHover] = useState(null);
  const format = (v) => `${v}${unit}`;

  if (!points.length) return <div className={styles.empty}>{emptyMessage}</div>;

  const max = niceMax(Math.max(1, ...points.map((p) => p.value || 0)));
  const slot = PLOT_W / points.length;
  // Cap the bar width so a 5-bucket chart doesn't render as five slabs.
  const barW = Math.min(slot * 0.68, 42);

  const barClass = (p, i) => {
    if (p.kind === "won") return styles.barWon;
    if (p.kind === "lost") return styles.barLost;
    if (p.kind === "urgent" || p.urgent) return styles.barUrgent;
    if (p.muted) return styles.barMuted;
    if (highlightIndex === i || hover === i) return `${styles.bar} ${styles.barActive}`;
    return styles.bar;
  };

  const labelStride = Math.max(1, Math.ceil(points.length / 12));

  return (
    <div className={styles.chart}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Distribution of ${valueLabel}`}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.5, 1].map((t) => {
          const gy = PAD.top + PLOT_H - t * PLOT_H;
          return (
            <g key={t}>
              <line className={styles.gridLine} x1={PAD.left} y1={gy} x2={VIEW_W - PAD.right} y2={gy} />
              <text className={styles.axisLabelY} x={PAD.left - 8} y={gy + 3.5}>
                {format(Math.round(max * t))}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          const value = p.value || 0;
          const h = (value / max) * PLOT_H;
          const cx = PAD.left + slot * i + slot / 2;
          return (
            <g key={`${p.label}-${i}`}>
              <rect
                className={styles.hitArea}
                x={PAD.left + slot * i}
                y={PAD.top}
                width={slot}
                height={PLOT_H}
                onMouseEnter={() => setHover(i)}
              />
              <rect
                className={barClass(p, i)}
                x={cx - barW / 2}
                y={PAD.top + PLOT_H - h}
                width={barW}
                // Zero stays visible as a hairline so the axis doesn't look
                // like it's missing categories.
                height={Math.max(h, value === 0 ? 1 : 2)}
                rx={3}
              />
            </g>
          );
        })}

        <line
          className={styles.axisLine}
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={VIEW_W - PAD.right}
          y2={PAD.top + PLOT_H}
        />

        {points.map((p, i) =>
          i % labelStride === 0 ? (
            <text
              key={`bl-${i}`}
              className={styles.axisLabel}
              x={PAD.left + slot * i + slot / 2}
              y={VIEW_H - 8}
              textAnchor="middle"
            >
              {p.label}
            </text>
          ) : null
        )}
      </svg>

      {hover !== null && (
        <div
          className={styles.tooltip}
          style={{
            left: `${((PAD.left + slot * hover + slot / 2) / VIEW_W) * 100}%`,
            top: `${((PAD.top + PLOT_H - ((points[hover].value || 0) / max) * PLOT_H) / VIEW_H) * 100}%`,
            marginTop: -8,
          }}
        >
          <span className={styles.tooltipLabel}>{points[hover].label}</span>
          <span className={styles.tooltipValue}>{format(points[hover].value || 0)}</span> {valueLabel}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import styles from "./charts.module.css";

const SIZE = 150;
const R_OUTER = 68;
const R_INNER = 44;
const CENTER = SIZE / 2;

// Slice colours. Named outcomes (won/lost/open) always get their semantic
// colour; anything else walks this palette in order so two donuts on the same
// screen stay visually distinct from each other.
const SEMANTIC = {
  won: "#16a34a",
  lost: "#dc2626",
  open: "var(--primary)",
};
const PALETTE = ["var(--primary)", "#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6"];

function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

// Standard donut-segment path: out along the start angle, around the outer
// radius, in, then back around the inner radius.
function arcPath(startAngle, endAngle) {
  const [x1, y1] = polar(CENTER, CENTER, R_OUTER, startAngle);
  const [x2, y2] = polar(CENTER, CENTER, R_OUTER, endAngle);
  const [x3, y3] = polar(CENTER, CENTER, R_INNER, endAngle);
  const [x4, y4] = polar(CENTER, CENTER, R_INNER, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M${x1} ${y1}`,
    `A${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L${x3} ${y3}`,
    `A${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

/**
 * Donut with a legend beside it. `slices` is [{ label, value, kind?, share? }].
 * Zero-value slices are dropped rather than rendered as invisible hairlines
 * that still take up a legend row.
 */
export default function DonutChart({
  slices = [],
  centerLabel = "total",
  emptyMessage = "Nothing to show yet.",
}) {
  const [hover, setHover] = useState(null);

  const visible = slices.filter((s) => (s.value || 0) > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);

  if (!total) return <div className={styles.empty}>{emptyMessage}</div>;

  const colorFor = (slice, i) => SEMANTIC[slice.kind] || PALETTE[i % PALETTE.length];

  // Built with a plain loop rather than a map with an accumulator: each slice's
  // start angle depends on the running total of the ones before it, and mutating
  // a captured variable inside a map callback is exactly what the React compiler
  // lint flags during render.
  const segments = [];
  let angle = 0;
  for (let i = 0; i < visible.length; i++) {
    const slice = visible[i];
    const sweep = (slice.value / total) * 360;
    segments.push({
      ...slice,
      color: colorFor(slice, i),
      start: angle,
      // A single 360° slice can't be drawn as an arc (start and end coincide),
      // so stop a hair short and let the join hide it.
      end: angle + (sweep >= 360 ? 359.999 : sweep),
      share: slice.share ?? Math.round((slice.value / total) * 1000) / 10,
    });
    angle += sweep;
  }

  return (
    <div className={styles.donutWrap}>
      <svg
        className={styles.donutSvg}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Breakdown by ${centerLabel}`}
      >
        {segments.map((seg, i) => (
          <path
            key={`${seg.label}-${i}`}
            className={styles.arc}
            d={arcPath(seg.start, seg.end)}
            fill={seg.color}
            opacity={hover === null || hover === i ? 1 : 0.35}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{`${seg.label}: ${seg.value} (${seg.share}%)`}</title>
          </path>
        ))}
        <text className={styles.donutCenterValue} x={CENTER} y={CENTER + 2}>
          {hover === null ? total : segments[hover].value}
        </text>
        <text className={styles.donutCenterLabel} x={CENTER} y={CENTER + 16}>
          {hover === null ? centerLabel : `${segments[hover].share}%`}
        </text>
      </svg>

      <div className={styles.donutLegend}>
        {segments.map((seg, i) => (
          <div
            key={`legend-${seg.label}-${i}`}
            className={styles.donutLegendRow}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className={styles.legendSwatch} style={{ background: seg.color }} />
            <span className={styles.donutLegendLabel}>{seg.label}</span>
            <span className={styles.donutLegendValue}>{seg.value}</span>
            <span className={styles.donutLegendShare}>{seg.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

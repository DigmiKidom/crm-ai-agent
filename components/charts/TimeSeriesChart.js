"use client";

import { useState } from "react";
import styles from "./charts.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

// Fixed viewBox with `width: 100%; height: auto` — the SVG scales with its
// container while every coordinate below stays in one predictable space, so a
// tooltip anchored at x/VIEW_W percent lands in the right place at any size.
const VIEW_W = 720;
const VIEW_H = 220;
const PAD = { top: 12, right: 10, bottom: 26, left: 38 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

// Axis maxima land on 1/2/5 x a power of ten so gridline labels read as round
// numbers instead of "37" / "74" / "111".
export function niceMax(value) {
  if (!value || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * Line/area chart over evenly spaced buckets.
 *
 * `points` is [{ label, value, compare?, meta? }]. A null `value` is a real gap
 * (e.g. a month where nothing was decided, which is not the same as 0%) and
 * breaks the line rather than dragging it to the floor.
 */
// `unit` is a plain string rather than a formatter function on purpose: this is
// a client component and the pages rendering it are server components, so a
// function prop can't cross that boundary — it isn't serializable.
export default function TimeSeriesChart({
  points = [],
  area = true,
  compareLabel = "Previous period",
  valueLabel = "Leads",
  unit = "",
  emptyMessage = "No data in this period yet.",
}) {
  const t = useT();
  const [hover, setHover] = useState(null);
  const format = (v) => `${v}${unit}`;

  if (!points.length) return <div className={styles.empty}>{emptyMessage}</div>;

  const hasCompare = points.some((p) => typeof p.compare === "number");
  const values = points.map((p) => p.value).filter((v) => typeof v === "number");
  const compares = hasCompare ? points.map((p) => p.compare ?? 0) : [];
  const max = niceMax(Math.max(1, ...values, ...compares));

  const x = (i) => (points.length === 1 ? PAD.left + PLOT_W / 2 : PAD.left + (i / (points.length - 1)) * PLOT_W);
  const y = (v) => PAD.top + PLOT_H - (v / max) * PLOT_H;

  // Consecutive runs of non-null values, each drawn as its own path so gaps
  // stay gaps.
  const segments = [];
  let run = [];
  points.forEach((p, i) => {
    if (typeof p.value === "number") {
      run.push([x(i), y(p.value), i]);
    } else if (run.length) {
      segments.push(run);
      run = [];
    }
  });
  if (run.length) segments.push(run);

  const toPath = (seg) => seg.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px} ${py}`).join(" ");

  const comparePath = hasCompare
    ? points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.compare ?? 0)}`).join(" ")
    : null;

  // Only ever ~7 x-axis labels, whatever the bucket count, so 36 months of
  // labels don't collide into mush.
  const labelStride = Math.max(1, Math.ceil(points.length / 7));
  const gridTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={styles.chart}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`${valueLabel} over time`}
        onMouseLeave={() => setHover(null)}
      >
        {gridTicks.map((tick) => {
          const gy = PAD.top + PLOT_H - tick * PLOT_H;
          return (
            <g key={tick}>
              <line className={styles.gridLine} x1={PAD.left} y1={gy} x2={VIEW_W - PAD.right} y2={gy} />
              <text className={styles.axisLabelY} x={PAD.left - 8} y={gy + 3.5}>
                {format(Math.round(max * tick))}
              </text>
            </g>
          );
        })}

        {area && segments.map((seg, si) => (
          <path
            key={`area-${si}`}
            className={styles.areaFill}
            d={`${toPath(seg)} L${seg[seg.length - 1][0]} ${PAD.top + PLOT_H} L${seg[0][0]} ${PAD.top + PLOT_H} Z`}
          />
        ))}

        {comparePath && <path className={styles.compareLine} d={comparePath} />}

        {segments.map((seg, si) => (
          <path key={`line-${si}`} className={styles.line} d={toPath(seg)} />
        ))}

        {/* A single-point series has no line to look at, so show the dot. */}
        {points.length === 1 && typeof points[0].value === "number" && (
          <circle className={styles.point} cx={x(0)} cy={y(points[0].value)} r={4} />
        )}

        {hover !== null && typeof points[hover].value === "number" && (
          <>
            <line
              className={styles.hoverGuide}
              x1={x(hover)}
              y1={PAD.top}
              x2={x(hover)}
              y2={PAD.top + PLOT_H}
            />
            <circle className={styles.point} cx={x(hover)} cy={y(points[hover].value)} r={4} />
          </>
        )}

        <line
          className={styles.axisLine}
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={VIEW_W - PAD.right}
          y2={PAD.top + PLOT_H}
        />

        {points.map((p, i) =>
          i % labelStride === 0 || i === points.length - 1 ? (
            <text
              key={`xl-${i}`}
              className={styles.axisLabel}
              x={x(i)}
              y={VIEW_H - 8}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            >
              {p.label}
            </text>
          ) : null
        )}

        {/* Full-height hover columns: the pointer never has to find the line. */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            className={styles.hitArea}
            x={x(i) - PLOT_W / points.length / 2}
            y={PAD.top}
            width={PLOT_W / points.length}
            height={PLOT_H}
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {hover !== null && (
        <div
          className={styles.tooltip}
          style={{
            left: `${(x(hover) / VIEW_W) * 100}%`,
            top: `${((typeof points[hover].value === "number" ? y(points[hover].value) : PAD.top) / VIEW_H) * 100}%`,
            marginTop: -10,
          }}
        >
          <span className={styles.tooltipLabel}>{points[hover].label}</span>
          <span className={styles.tooltipValue}>
            {typeof points[hover].value === "number" ? format(points[hover].value) : "No data"}
          </span>{" "}
          {valueLabel}
          {points[hover].meta && (
            <span className={styles.tooltipLabel}>{points[hover].meta}</span>
          )}
          {hasCompare && (
            <span className={styles.tooltipLabel}>
              {compareLabel}: {format(points[hover].compare ?? 0)}
            </span>
          )}
        </div>
      )}

      {hasCompare && (
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: "var(--primary)" }} />
            {t("analytics.panel2.thisPeriod")}
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDash} />
            {compareLabel}
          </span>
        </div>
      )}
    </div>
  );
}

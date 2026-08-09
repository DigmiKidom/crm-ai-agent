// Pure date math for the calendar module — no DB, no React, unit-testable
// by plain Node the same way lib/analytics.js and lib/formFields.js are.

export const VIEWS = ["month", "week", "day"];
export const DEFAULT_VIEW = "month";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function startOfMonth(d) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

// Sunday-based, matching the weekday convention lib/analytics.js already
// uses (WEEKDAYS = ["Sun", "Mon", ...]) — the two calendars in this app
// should agree on what day a week starts.
function startOfWeek(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

/**
 * The query window `[start, end)` for a view, plus a wider `[gridStart,
 * gridEnd)` for month view — a month grid shows full weeks, so it always
 * leads/trails into the adjacent months a little; those extra days still
 * need their events fetched even though they're outside the month itself.
 */
export function resolveCalendarRange(view, refDate = new Date()) {
  const ref = startOfDay(refDate);

  if (view === "day") {
    const start = ref;
    const end = addDays(ref, 1);
    return { view, start, end, gridStart: start, gridEnd: end };
  }

  if (view === "week") {
    const start = startOfWeek(ref);
    const end = addDays(start, 7);
    return { view, start, end, gridStart: start, gridEnd: end };
  }

  const start = startOfMonth(ref);
  const end = startOfMonth(addMonths(start, 1));
  const gridStart = startOfWeek(start);
  // The week containing the month's last day, plus 7 — i.e. through the end
  // of that trailing week.
  const gridEnd = addDays(startOfWeek(addDays(end, -1)), 7);
  return { view, start, end, gridStart, gridEnd };
}

/** Every day from `start` (inclusive) to `end` (exclusive) as an array of Dates. */
export function eachDay(start, end) {
  const days = [];
  let cur = startOfDay(start);
  const stop = startOfDay(end);
  while (cur < stop) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

/** Moves the reference date one view-unit forward or back, for the </> nav controls. */
export function shiftRef(view, refDate, direction) {
  if (view === "day") return addDays(refDate, direction);
  if (view === "week") return addDays(refDate, direction * 7);
  return addMonths(refDate, direction);
}

export function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Human label for the view header — "March 2026", "Mar 2 – 8, 2026", "Tue, Mar 4". */
export function formatRangeLabel(view, refDate, locale = "en") {
  const ref = startOfDay(refDate);

  if (view === "day") {
    return ref.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  if (view === "week") {
    const start = startOfWeek(ref);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString(locale, { month: "short", day: "numeric" });
    const endLabel = end.toLocaleDateString(
      locale,
      sameMonth ? { day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric" }
    );
    return `${startLabel} – ${endLabel}`;
  }

  return ref.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

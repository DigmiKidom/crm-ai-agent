// Small coercions shared by the tool routes.
//
// Each of these existed as a local `str()` inside one or two route files
// before there were five tools with near-identical create/update handlers.
// Five copies of "trim and clamp a string" is five chances for one of them to
// forget the clamp, so they live here — but they stay coercions only. No
// route's *rules* are in this file: what is required, what the error message
// is, and what the limit means all stay next to the route that enforces them.

/** Trims and clamps to `max`, turning null/undefined/numbers into a string. */
export function str(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * A finite number within `[min, max]`, or null.
 *
 * Null rather than 0 for anything unparseable: a route that wants to reject a
 * missing amount and one that wants to leave a field untouched need to tell
 * "absent" from "zero", and a silent 0 makes both impossible.
 */
export function num(value, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

/** Strict boolean — only a real `true` is true, so "false" isn't truthy. */
export function bool(value) {
  return value === true;
}

/**
 * A calendar date, normalised to midnight UTC.
 *
 * The tools that take a date (a task's due date, a ledger row) mean a day, not
 * an instant. Pinning the time to UTC midnight means "due today" doesn't
 * depend on the hour the row was created, and two rows for the same day sort
 * and group identically no matter who typed them or from which timezone.
 */
export function dateOnly(value) {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

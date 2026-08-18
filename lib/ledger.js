// Money arithmetic for the finances tool.
//
// Framework-free so test/ledger.test.mjs can exercise it without a database —
// the totals are the whole value of the tool, and a rounding bug there is one
// nobody notices until they've trusted a wrong number for a month.


/**
 * Amounts are stored positive with the direction in `type` (see the model).
 * This is the one place that applies the sign, so no caller has to remember.
 */
export const LEDGER_TYPES = ["income", "expense"];
export const MAX_LEDGER_DESCRIPTION = 200;
// Guards against a fat-fingered paste becoming a number that breaks the
// monthly totals. Well above any figure this tool is meant to hold.
export const MAX_LEDGER_AMOUNT = 1_000_000_000;

export function signedAmount(entry) {
  const amount = Number(entry?.amount);
  if (!Number.isFinite(amount)) return 0;
  return entry?.type === "expense" ? -amount : amount;
}

/**
 * Rounds to whole cents.
 *
 * Sums of floats drift — 0.1 + 0.2 is famously not 0.3 — and a ledger that
 * shows ₪1,204.9999999999998 has lost the reader's trust regardless of how
 * close it is. Rounding at each total keeps the displayed numbers exact to the
 * precision anyone actually enters.
 */
export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** `{ income, expense, net }` for a set of entries. Expense is positive. */
export function summarize(entries = []) {
  let income = 0;
  let expense = 0;

  for (const entry of entries) {
    const amount = Number(entry?.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;
    if (entry?.type === "expense") expense += amount;
    else if (entry?.type === "income") income += amount;
  }

  return { income: round2(income), expense: round2(expense), net: round2(income - expense) };
}

/** The YYYY-MM a date falls in, in UTC — the grouping key for monthly totals. */
export function monthKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 7);
}

/**
 * Totals per calendar month, newest month first.
 *
 * Returns `[{ month, income, expense, net }]`. Months with no entries are
 * absent rather than zero-filled: the summary sits above a list of real rows,
 * and inventing empty months would imply a completeness the data doesn't have.
 */
export function monthlySummaries(entries = []) {
  const buckets = new Map();

  for (const entry of entries) {
    const key = monthKey(entry?.date);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(entry);
  }

  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, rows]) => ({ month, ...summarize(rows) }));
}

/** The first and last instant of a UTC month, for a date-range query. */
export function monthRange(month) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

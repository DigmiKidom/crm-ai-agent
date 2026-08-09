// Deal resolution summaries — the record of how a deal actually ended.
//
// Model-free so the closure modal (a client component) shares the limits and
// validation with the API route that persists them.

export const MAX_CLOSURE_SERVICES = 200;
export const MAX_CLOSURE_NOTES = 1000;

/** Dates far enough ahead to be a typo rather than a plan. */
const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

function closureError(code, message) {
  return Object.assign(new Error(message), { code });
}

/**
 * Validates and normalizes a submitted resolution summary.
 *
 * Two things are actually enforced, because both corrupt reporting rather
 * than merely looking untidy:
 *
 *   amount   — must be a real, non-negative number. A NaN here would poison
 *              every revenue total that sums it.
 *   closedAt — may be backdated freely (an owner catching up on Friday is
 *              recording Tuesday's deal), but not dated into the future,
 *              which is always a mistyped year and always lands the deal in
 *              a reporting period that hasn't happened.
 *
 * Everything else is free text and only length-capped: "what did they buy"
 * has no schema in a business this size.
 */
export function normalizeClosure(input, { fallbackAmount = 0, now = Date.now() } = {}) {
  const source = input && typeof input === "object" ? input : {};

  const rawAmount = source.amount === "" || source.amount === undefined || source.amount === null
    ? fallbackAmount
    : source.amount;
  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount < 0) {
    throw closureError("INVALID_AMOUNT", "Enter a deal amount of zero or more.");
  }

  let closedAt = new Date();
  if (source.closedAt) {
    const parsed = new Date(source.closedAt);
    if (Number.isNaN(parsed.getTime())) {
      throw closureError("INVALID_DATE", "That closing date isn't valid.");
    }
    if (parsed.getTime() > now + FUTURE_TOLERANCE_MS) {
      throw closureError("FUTURE_DATE", "A deal can't close in the future.");
    }
    closedAt = parsed;
  }

  return {
    services: String(source.services ?? "").trim().slice(0, MAX_CLOSURE_SERVICES),
    resolutionNotes: String(source.resolutionNotes ?? "").trim().slice(0, MAX_CLOSURE_NOTES),
    closedAt,
    // Rounded to whole units: the CRM displays money with no decimals
    // everywhere else (see lib/money.js), and storing 1999.999 to render
    // "2,000" invites a reconciliation argument later.
    amount: Math.round(amount),
  };
}

/**
 * Whether moving to this stage should prompt for a summary.
 *
 * Only on the transition INTO a closed state, and only when there isn't a
 * summary already — re-prompting every time a lead is nudged between two
 * won-classified stages would train people to dismiss the dialog.
 */
export function shouldPromptForClosure({ fromStatus, toStatus, hasClosure }) {
  if (toStatus !== "won" && toStatus !== "lost") return false;
  if (fromStatus === toStatus) return false;
  return !hasClosure;
}

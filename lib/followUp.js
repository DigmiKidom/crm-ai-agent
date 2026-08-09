// Rule-based follow-up reminders.
//
// No AI, no per-lead API call, no cost that scales with the number of leads:
// one scheduled query per run compares a date against a number. That's the
// whole engine, and it's deliberate — "this lead has gone quiet for two
// weeks" is arithmetic, and paying a language model to perform arithmetic on
// every lead in the database would be an expensive way to be less reliable.
//
// Model-free so the settings UI (a client component) can import the intervals
// without pulling in Mongoose.

export const FOLLOW_UP_INTERVALS = ["7_days", "14_days", "30_days", "never"];

export const DEFAULT_FOLLOW_UP_INTERVAL = "7_days";

const DAYS_BY_INTERVAL = {
  "7_days": 7,
  "14_days": 14,
  "30_days": 30,
  never: null,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeInterval(value) {
  return FOLLOW_UP_INTERVALS.includes(value) ? value : DEFAULT_FOLLOW_UP_INTERVAL;
}

/** Days of silence before a lead is flagged; null means "never flag". */
export function intervalDays(interval) {
  return DAYS_BY_INTERVAL[normalizeInterval(interval)];
}

/**
 * The cutoff: a lead whose last activity is at or before this has gone quiet
 * for long enough. Null when the tenant has reminders switched off.
 */
export function staleBefore(interval, now = Date.now()) {
  const days = intervalDays(interval);
  if (days === null) return null;
  return new Date(now - days * DAY_MS);
}

/**
 * Whether one lead should be flagged, given its tenant's setting.
 *
 * Only open deals are ever flagged. Chasing a lead you already won is
 * embarrassing; chasing one you lost is worse.
 *
 * `lastActivityAt` falls back to `createdAt` for leads captured before the
 * field existed — a lead that arrived three weeks ago and was never touched
 * is exactly what this is for, so treating a missing value as "no activity
 * yet" rather than skipping it is the point.
 */
export function shouldFlag(lead, interval, now = Date.now()) {
  if (!lead) return false;
  if (lead.dealStatus && lead.dealStatus !== "open") return false;

  const cutoff = staleBefore(interval, now);
  if (!cutoff) return false;

  const last = lead.lastActivityAt || lead.createdAt;
  if (!last) return false;

  return new Date(last).getTime() <= cutoff.getTime();
}

/**
 * The fields to $set whenever something counts as real activity on a lead.
 *
 * Used by every route that represents contact — a stage move, a note, a
 * follow-up message, saving the contact to a phone. Centralised so "what
 * counts as activity" is one answer rather than four subtly different ones.
 *
 * Note what is NOT activity: marking a lead read. Opening something to look
 * at it is not the same as doing anything about it, and treating it as such
 * would let an owner clear every reminder by scrolling their inbox.
 */
export function activityUpdate(now = new Date()) {
  return {
    lastActivityAt: now,
    needsFollowUp: false,
    followUpFlaggedAt: null,
  };
}

/**
 * The pre-written follow-up message. Pure string interpolation — the "zero
 * token" half of the feature.
 *
 * `template` is the tenant's own text with {name} in it; the default is
 * supplied by the caller from its translation pack so the message is in the
 * owner's language rather than hardcoded English.
 */
export function followUpMessage(template, leadName = "") {
  return String(template || "")
    .replace(/\{name\}/g, String(leadName || "").trim())
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Abuse reporting and page moderation.
//
// Model-free (same reason as lib/formFields.js): the public report modal is a
// client component on an ISR-cached landing page and can't pull Mongoose into
// its bundle, while the PageReport model and the admin routes import the same
// constants from here.

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "fraud",
  "copyright",
  "abusive",
  "other",
];

export const MAX_REPORT_NOTES = 1000;

export const REPORT_STATUSES = ["open", "dismissed", "actioned"];

/**
 * How long a page stays visible in the "recently actioned" part of the queue
 * before the default filter hides it. Reviewed reports are never deleted —
 * they're the audit trail for why a page was taken down.
 */
export const RECENT_REVIEW_WINDOW_DAYS = 30;

function reportError(code, message) {
  return Object.assign(new Error(message), { code });
}

/**
 * Validates and normalizes a submitted report. Throws with a stable `code`
 * the API route maps to a localized message.
 *
 * Everything a stranger can type is length-capped here rather than at the
 * schema: a 5MB "notes" field is a denial-of-service on the moderation queue,
 * not just an oversized document.
 */
export function normalizeReport(input) {
  const reason = String(input?.reason || "").trim();
  if (!REPORT_REASONS.includes(reason)) {
    throw reportError("UNKNOWN_REASON", "Choose a reason for this report.");
  }

  const notes = String(input?.notes ?? "").trim().slice(0, MAX_REPORT_NOTES);

  const reporterEmail = String(input?.reporterEmail ?? "").trim().slice(0, 160);
  if (reporterEmail && !/^\S+@\S+\.\S+$/.test(reporterEmail)) {
    throw reportError("INVALID_EMAIL", "That email address doesn't look right.");
  }

  // "Other" with no explanation is unactionable — an admin opening the queue
  // would have nothing to assess. Every other reason is self-describing.
  if (reason === "other" && !notes) {
    throw reportError("NOTES_REQUIRED", "Tell us briefly what's wrong with this page.");
  }

  return { reason, notes, reporterEmail };
}

/**
 * A deliberately low-tech bot check, in place of a third-party CAPTCHA.
 *
 * Two signals, both invisible to a real person:
 *   - a honeypot field that's hidden with CSS; a human never fills it in, and
 *     a form-filling bot fills in everything it finds;
 *   - the time between the modal opening and the form being submitted, which
 *     for a scripted post is effectively zero.
 *
 * This is not equivalent to a real CAPTCHA and isn't claimed to be — it stops
 * naive automation, and the per-IP rate limit in the route handler is what
 * bounds a determined one. Swapping in Turnstile/hCaptcha later means adding
 * a token check here; nothing else in the flow changes.
 */
export const MIN_FILL_SECONDS = 2;

export function looksAutomated({ honeypot, elapsedMs }) {
  if (String(honeypot ?? "").trim() !== "") return true;
  const elapsed = Number(elapsedMs);
  // A missing/NaN timestamp isn't treated as automated — an older cached page
  // or a browser that blocked the timer shouldn't lock a real person out of
  // reporting abuse. The rate limit still applies.
  if (!Number.isFinite(elapsed)) return false;
  return elapsed < MIN_FILL_SECONDS * 1000;
}

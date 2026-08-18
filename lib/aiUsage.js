// Daily quota for the AI website design agent.
//
// Framework-free and side-effect-free so it can be unit-tested without a
// database or a request (see test/aiUsage.test.mjs). The route does the
// reading and writing; this module only answers "given this counter and this
// moment, what is the state?".

/** Designs one tenant may generate per UTC day. */
export const AI_DESIGN_DAILY_LIMIT = 3;

/**
 * The UTC calendar day of an instant, as YYYY-MM-DD.
 *
 * UTC rather than the tenant's local timezone, deliberately: the reset has to
 * be a property of the stored counter, not of whoever happens to be looking at
 * it. A tenant with people in Tel Aviv and New York must not get two resets a
 * day because the boundary moved with the viewer — and a counter that resets
 * at a time the server can compute without knowing anything about the client
 * is one that can't be gamed by changing a device clock.
 */
export function utcDayKey(at = new Date()) {
  return new Date(at).toISOString().slice(0, 10);
}

/**
 * Reads a stored `{ count, lastResetDate }` and reports where the tenant
 * stands right now.
 *
 * Returns `{ used, remaining, limit, allowed, dayKey, stale }`. `stale` is true
 * when the stored counter belongs to an earlier UTC day and should be treated
 * as zero — the caller decides whether to persist that reset (the generate
 * route does, as part of the same write that increments) or just report it (the
 * usage endpoint, which must not write on a GET).
 *
 * Note that a *missing* counter and an *expired* one are the same answer. That
 * matters for the tenants that existed before this field did: they read as a
 * fresh day with nothing used, rather than as a malformed document.
 */
export function readAiDesignUsage(usage, at = new Date()) {
  const dayKey = utcDayKey(at);
  const storedDay = usage?.lastResetDate ? utcDayKey(usage.lastResetDate) : null;
  const stale = storedDay !== dayKey;

  const rawCount = Number(usage?.count);
  const used = stale || !Number.isFinite(rawCount) || rawCount < 0 ? 0 : Math.floor(rawCount);
  const remaining = Math.max(0, AI_DESIGN_DAILY_LIMIT - used);

  return {
    used,
    remaining,
    limit: AI_DESIGN_DAILY_LIMIT,
    allowed: remaining > 0,
    dayKey,
    stale,
  };
}

/**
 * The counter to store after one generation is spent.
 *
 * Always returns an absolute `{ count, lastResetDate }` rather than a `$inc`,
 * because a same-day increment and a new-day reset are the same write from the
 * caller's point of view — and an absolute value can't drift if the stored
 * document was left in a strange state by an older version of this code.
 */
export function nextAiDesignUsage(usage, at = new Date()) {
  const state = readAiDesignUsage(usage, at);
  return {
    count: state.used + 1,
    // Midnight of the current UTC day, not "now": the field names the day the
    // counter belongs to, so two generations an hour apart write the identical
    // value and the day boundary stays exactly where UTC puts it.
    lastResetDate: new Date(`${state.dayKey}T00:00:00.000Z`),
  };
}

/** Seconds until the quota resets — the Retry-After on the 429. */
export function secondsUntilReset(at = new Date()) {
  const now = new Date(at);
  const nextMidnight = new Date(`${utcDayKey(now)}T00:00:00.000Z`);
  nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextMidnight.getTime() - now.getTime()) / 1000));
}

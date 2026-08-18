// The AI design quota. Every branch here decides whether a paid model call
// happens, so the day-boundary arithmetic is worth pinning down exactly.
import assert from "node:assert/strict";
import {
  AI_DESIGN_DAILY_LIMIT,
  nextAiDesignUsage,
  readAiDesignUsage,
  secondsUntilReset,
  utcDayKey,
} from "../lib/aiUsage.js";

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("  ok   " + name); pass++; }
  catch (e) { console.log("  FAIL " + name + "\n        " + e.message); fail++; }
}

const noon = new Date("2026-08-18T12:00:00.000Z");
const day = new Date("2026-08-18T00:00:00.000Z");

console.log("\n— AI design quota —");

check("the limit is three a day", () => {
  assert.equal(AI_DESIGN_DAILY_LIMIT, 3);
});

check("a tenant with no counter reads as a fresh day", () => {
  // Every tenant that existed before this field did lands here.
  const usage = readAiDesignUsage(undefined, noon);
  assert.deepEqual(
    { used: usage.used, remaining: usage.remaining, allowed: usage.allowed },
    { used: 0, remaining: 3, allowed: true }
  );
});

check("a counter from an earlier day is stale and reads as zero", () => {
  const usage = readAiDesignUsage({ count: 3, lastResetDate: new Date("2026-08-17T00:00:00.000Z") }, noon);
  assert.equal(usage.stale, true);
  assert.equal(usage.used, 0);
  assert.equal(usage.allowed, true);
});

check("a counter from the same day counts", () => {
  const usage = readAiDesignUsage({ count: 2, lastResetDate: day }, noon);
  assert.equal(usage.stale, false);
  assert.equal(usage.used, 2);
  assert.equal(usage.remaining, 1);
  assert.equal(usage.allowed, true);
});

check("the third generation is the last one", () => {
  const usage = readAiDesignUsage({ count: 3, lastResetDate: day }, noon);
  assert.equal(usage.remaining, 0);
  assert.equal(usage.allowed, false);
});

check("a corrupt count can't grant extra generations", () => {
  // A negative or non-numeric count must not read as "under the limit" by
  // arithmetic accident — it resets to zero used, never to negative used.
  for (const count of [-5, NaN, "three", null]) {
    const usage = readAiDesignUsage({ count, lastResetDate: day }, noon);
    assert.equal(usage.used, 0, String(count));
    assert.equal(usage.remaining, 3, String(count));
  }
});

check("spending one increments within the day", () => {
  const next = nextAiDesignUsage({ count: 1, lastResetDate: day }, noon);
  assert.equal(next.count, 2);
  assert.equal(next.lastResetDate.toISOString(), day.toISOString());
});

check("spending one on a new day resets to 1", () => {
  const next = nextAiDesignUsage(
    { count: 3, lastResetDate: new Date("2026-08-17T00:00:00.000Z") },
    noon
  );
  assert.equal(next.count, 1);
  assert.equal(next.lastResetDate.toISOString(), day.toISOString());
});

check("the stored date is midnight, not the moment of use", () => {
  // Two generations an hour apart must write the identical date, or the
  // "same day?" comparison in the atomic claim stops matching.
  const a = nextAiDesignUsage({ count: 0, lastResetDate: null }, new Date("2026-08-18T09:15:00.000Z"));
  const b = nextAiDesignUsage({ count: 1, lastResetDate: a.lastResetDate }, new Date("2026-08-18T23:59:00.000Z"));
  assert.equal(a.lastResetDate.toISOString(), b.lastResetDate.toISOString());
  assert.equal(b.count, 2);
});

check("the day boundary is UTC midnight, not local", () => {
  assert.equal(utcDayKey(new Date("2026-08-18T23:59:59.999Z")), "2026-08-18");
  assert.equal(utcDayKey(new Date("2026-08-19T00:00:00.000Z")), "2026-08-19");
});

check("Retry-After counts down to the next UTC midnight", () => {
  assert.equal(secondsUntilReset(new Date("2026-08-18T23:59:00.000Z")), 60);
  assert.equal(secondsUntilReset(new Date("2026-08-18T00:00:00.000Z")), 86400);
  // Never zero or negative — a Retry-After of 0 invites an immediate retry.
  assert.ok(secondsUntilReset(new Date("2026-08-18T23:59:59.999Z")) >= 1);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

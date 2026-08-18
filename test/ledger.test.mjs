// Money arithmetic. A rounding bug here is one nobody notices until they have
// trusted a wrong number for a month.
import assert from "node:assert/strict";
import { monthKey, monthRange, monthlySummaries, round2, signedAmount, summarize } from "../lib/ledger.js";

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("  ok   " + name); pass++; }
  catch (e) { console.log("  FAIL " + name + "\n        " + e.message); fail++; }
}

const entries = [
  { date: "2026-08-01T00:00:00.000Z", type: "income", amount: 1200 },
  { date: "2026-08-14T00:00:00.000Z", type: "expense", amount: 300.5 },
  { date: "2026-07-20T00:00:00.000Z", type: "income", amount: 500 },
  { date: "2026-07-22T00:00:00.000Z", type: "expense", amount: 500 },
];

console.log("\n— ledger —");

check("the sign lives in the type, not the amount", () => {
  assert.equal(signedAmount({ type: "income", amount: 100 }), 100);
  assert.equal(signedAmount({ type: "expense", amount: 100 }), -100);
  assert.equal(signedAmount({ type: "expense", amount: "nonsense" }), 0);
});

check("totals separate income from expenses", () => {
  assert.deepEqual(summarize(entries), { income: 1700, expense: 800.5, net: 899.5 });
});

check("float drift never reaches the displayed total", () => {
  // 0.1 + 0.2 is the classic; a ledger showing 0.30000000000000004 has lost
  // the reader regardless of how close it is.
  const drifty = [
    { date: "2026-08-01", type: "income", amount: 0.1 },
    { date: "2026-08-01", type: "income", amount: 0.2 },
  ];
  assert.equal(summarize(drifty).income, 0.3);
  assert.equal(round2(1204.9999999999998), 1205);
});

check("a negative or unparseable amount is ignored rather than subtracted", () => {
  const bad = [
    { date: "2026-08-01", type: "income", amount: -50 },
    { date: "2026-08-01", type: "income", amount: "abc" },
    { date: "2026-08-01", type: "income", amount: 10 },
  ];
  assert.equal(summarize(bad).income, 10);
});

check("an unknown type counts as neither", () => {
  assert.deepEqual(summarize([{ date: "2026-08-01", type: "refund", amount: 99 }]),
    { income: 0, expense: 0, net: 0 });
});

check("months group in UTC, newest first", () => {
  const months = monthlySummaries(entries);
  assert.deepEqual(months.map((m) => m.month), ["2026-08", "2026-07"]);
  assert.equal(months[0].net, 899.5);
  // July broke even exactly — the interesting case for a net of zero.
  assert.equal(months[1].net, 0);
});

check("months with no entries are absent, not zero-filled", () => {
  const sparse = monthlySummaries([
    { date: "2026-08-01", type: "income", amount: 1 },
    { date: "2026-05-01", type: "income", amount: 1 },
  ]);
  assert.deepEqual(sparse.map((m) => m.month), ["2026-08", "2026-05"]);
});

check("an unparseable date drops out of the grouping", () => {
  assert.equal(monthKey("not a date"), null);
  assert.deepEqual(monthlySummaries([{ date: "not a date", type: "income", amount: 5 }]), []);
});

check("a month range is half-open, so no row lands in two months", () => {
  const { start, end } = monthRange("2026-08");
  assert.equal(start.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(end.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(monthRange("nonsense"), null);
});

check("December rolls into the next year", () => {
  assert.equal(monthRange("2026-12").end.toISOString(), "2027-01-01T00:00:00.000Z");
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

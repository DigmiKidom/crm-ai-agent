// resolveRange is the function that crashed with "locale is not defined".
// It's exported and pure, so it can be exercised directly.
import { resolveRange, RANGE_KEYS, classifyStages, humanDuration, percent } from "../lib/analytics.js";
import en from "../lib/i18n/dictionaries/en.json" with { type: "json" };
import he from "../lib/i18n/dictionaries/he.json" with { type: "json" };

const makeT = (d) => (k, v) => {
  let n = d; for (const p of k.split(".")) n = n?.[p];
  let s = typeof n === "string" ? n : k;
  return v ? s.replace(/\{(\w+)\}/g, (m, x) => (x in v ? String(v[x]) : m)) : s;
};

let pass = 0, fail = 0;
const check = (name, fn) => { try { fn(); console.log("  ok   " + name); pass++; }
  catch (e) { console.log("  FAIL " + name + "\n        " + e.message); fail++; } };

for (const locale of ["en", "he"]) {
  console.log(`\n— locale: ${locale} —`);
  for (const key of RANGE_KEYS) {
    check(`resolveRange("${key}") builds labelled buckets`, () => {
      const r = resolveRange(key, locale);
      if (!r.buckets.length) throw new Error("no buckets");
      const bad = r.buckets.filter((b) => typeof b.label !== "string" || !b.label);
      if (bad.length) throw new Error(`${bad.length} buckets missing a label`);
      if (!(r.start instanceof Date) || !(r.prevStart instanceof Date)) throw new Error("bad range dates");
      if (!(r.prevStart < r.start)) throw new Error("prevStart must precede start");
    });
  }
  check("bucket labels are localized (he differs from en)", () => {
    const a = resolveRange("year", "en").buckets.map(b => b.label).join();
    const b = resolveRange("year", "he").buckets.map(b => b.label).join();
    if (locale === "he" && a === b) throw new Error("month names identical across locales");
  });
}

console.log("\n— locale-free helpers —");
check("resolveRange defaults locale when omitted", () => {
  const r = resolveRange("week");
  if (!r.buckets.every(b => b.label)) throw new Error("labels missing without explicit locale");
});
check("unknown range key falls back", () => {
  if (!resolveRange("nonsense", "en").buckets.length) throw new Error("no fallback");
});
check("humanDuration translates in both locales", () => {
  const tEn = makeT(en), tHe = makeT(he);
  if (humanDuration(null, tEn) !== "—") throw new Error("null case");
  if (humanDuration(30_000, tEn) !== en.analytics.duration.underMinute) throw new Error("under-minute en");
  if (humanDuration(30_000, tHe) !== he.analytics.duration.underMinute) throw new Error("under-minute he");
  if (!humanDuration(5 * 60_000, tHe).includes("5")) throw new Error("minutes he: " + humanDuration(5*60_000, tHe));
});
check("classifyStages still works", () => {
  // Returns Sets plus an isOpen() predicate, not arrays.
  const c = classifyStages(["new", "contacted", "won", "lost"]);
  if (!c.won.has("won")) throw new Error("won not classified");
  if (!c.lost.has("lost")) throw new Error("lost not classified");
  if (!c.isOpen("contacted") || c.isOpen("won")) throw new Error("isOpen wrong");
});
check("percent guards divide-by-zero", () => { if (percent(0, 0) !== 0) throw new Error("NaN leak"); });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

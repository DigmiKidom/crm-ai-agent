// VCard generation, the follow-up rules, deal closure, and CSV export.
//
// All pure functions, and all of them decide something a person will later
// rely on: what lands in their phone, which leads get chased, and what a
// revenue total says.
import { buildVCard, vcardFilename } from "../lib/vcard.js";
import {
  shouldFlag,
  staleBefore,
  intervalDays,
  normalizeInterval,
  activityUpdate,
  followUpMessage,
  FOLLOW_UP_INTERVALS,
} from "../lib/followUp.js";
import { normalizeClosure, shouldPromptForClosure } from "../lib/dealClosure.js";
import { closedDealsCsv } from "../lib/closedDeals.js";

let pass = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log("  ok   " + name);
    pass++;
  } catch (e) {
    console.log("  FAIL " + name + "\n        " + e.message);
    failures.push(name);
  }
}
function eq(actual, expected, what = "") {
  if (actual !== expected) {
    throw new Error(`${what}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
const DAY = 86400000;

console.log("\n— vcard —");

const LEAD = {
  _id: "abc",
  name: "Dana Cohen",
  email: "dana@example.com",
  phone: "+972 50 123 4567",
  message: "Looking for a quote",
  notes: "Called Tuesday",
  customFields: [{ key: "service", label: "Service", value: "Kitchen renovation" }],
  createdAt: "2026-08-01T10:00:00.000Z",
};

check("produces a well-formed VCARD 3.0", () => {
  const card = buildVCard(LEAD, { businessName: "Acme" });
  if (!card.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")) throw new Error("bad header: " + card.slice(0, 40));
  if (!card.endsWith("END:VCARD\r\n")) throw new Error("bad footer");
  // CRLF between every property — iOS rejects bare newlines.
  if (/[^\r]\n/.test(card)) throw new Error("found a bare LF");
});

check("carries name, phone, email and org", () => {
  const card = buildVCard(LEAD, { businessName: "Acme" });
  for (const line of [
    "FN:Dana Cohen",
    "N:Cohen;Dana;;;",
    "ORG:Acme",
    "TEL;TYPE=CELL:+972 50 123 4567",
    "EMAIL;TYPE=INTERNET:dana@example.com",
  ]) {
    if (!card.includes(line)) throw new Error("missing " + line);
  }
});

check("folds the business context into NOTE", () => {
  const card = buildVCard(LEAD, { businessName: "Acme", labels: { via: "Lead from", captured: "Captured:" } });
  const note = card.split("\r\n").find((l) => l.startsWith("NOTE:"));
  if (!note) throw new Error("no NOTE line");
  for (const fragment of ["Lead from Acme", "Looking for a quote", "Service: Kitchen renovation", "Called Tuesday"]) {
    if (!note.includes(fragment.replace(/,/g, "\\,"))) throw new Error("missing " + fragment);
  }
});

check("escapes the characters that would corrupt the card", () => {
  // A comma or semicolon left raw silently truncates the field on import —
  // a bug you'd only see days later, in someone's phone.
  const card = buildVCard(
    { name: "Cohen, Dana", notes: "Two things; then more" },
    { businessName: "Acme; Ltd" }
  );
  if (!card.includes("FN:Cohen\\, Dana")) throw new Error("comma not escaped");
  if (!card.includes("ORG:Acme\\; Ltd")) throw new Error("semicolon not escaped");
  if (!card.includes("Two things\\; then more")) throw new Error("note semicolon not escaped");
});

check("omits fields the lead doesn't have", () => {
  const card = buildVCard({ name: "Dana" }, {});
  if (card.includes("TEL")) throw new Error("empty TEL line emitted");
  if (card.includes("EMAIL")) throw new Error("empty EMAIL line emitted");
  if (card.includes("ORG")) throw new Error("empty ORG line emitted");
});

check("a one-word name still produces a valid N", () => {
  eq(buildVCard({ name: "Madonna" }, {}).includes("N:;Madonna;;;"), true);
});

check("filenames are safe and readable", () => {
  eq(vcardFilename("Dana Cohen"), "Dana-Cohen.vcf");
  eq(vcardFilename("../../etc/passwd"), "etcpasswd.vcf");
  eq(vcardFilename(""), "contact.vcf");
  // Hebrew names survive — \p{L} covers every script.
  eq(vcardFilename("דנה כהן"), "דנה-כהן.vcf");
});

console.log("\n— follow-up rules —");

check("intervals map to the documented day counts", () => {
  eq(intervalDays("7_days"), 7);
  eq(intervalDays("14_days"), 14);
  eq(intervalDays("30_days"), 30);
  eq(intervalDays("never"), null);
  // Anything unrecognised falls back to the default rather than disabling.
  eq(intervalDays("nonsense"), 7);
  eq(normalizeInterval(undefined), "7_days");
});

check("'never' produces no cutoff at all", () => {
  eq(staleBefore("never"), null);
});

check("flags an open lead that has gone quiet", () => {
  const now = Date.now();
  eq(shouldFlag({ dealStatus: "open", lastActivityAt: new Date(now - 8 * DAY) }, "7_days", now), true);
  eq(shouldFlag({ dealStatus: "open", lastActivityAt: new Date(now - 3 * DAY) }, "7_days", now), false);
});

check("never flags a closed deal", () => {
  const now = Date.now();
  const quiet = new Date(now - 90 * DAY);
  // Chasing a lead you already won is embarrassing; chasing one you lost is
  // worse.
  eq(shouldFlag({ dealStatus: "won", lastActivityAt: quiet }, "7_days", now), false);
  eq(shouldFlag({ dealStatus: "lost", lastActivityAt: quiet }, "7_days", now), false);
});

check("never flags anything when reminders are off", () => {
  const now = Date.now();
  eq(shouldFlag({ dealStatus: "open", lastActivityAt: new Date(now - 400 * DAY) }, "never", now), false);
});

check("falls back to createdAt for leads predating the field", () => {
  const now = Date.now();
  eq(shouldFlag({ dealStatus: "open", createdAt: new Date(now - 20 * DAY) }, "7_days", now), true);
  eq(shouldFlag({ dealStatus: "open", createdAt: new Date(now - 2 * DAY) }, "7_days", now), false);
});

check("the boundary is inclusive", () => {
  const now = Date.now();
  eq(shouldFlag({ dealStatus: "open", lastActivityAt: new Date(now - 7 * DAY) }, "7_days", now), true);
});

check("activity clears the flag and restarts the clock", () => {
  const at = new Date("2026-08-08T09:00:00.000Z");
  const update = activityUpdate(at);
  eq(update.needsFollowUp, false);
  eq(update.followUpFlaggedAt, null);
  eq(update.lastActivityAt, at);
});

check("the follow-up message is plain interpolation", () => {
  eq(
    followUpMessage("Hi {name}, just following up on our previous conversation!", "Dana"),
    "Hi Dana, just following up on our previous conversation!"
  );
  // Hebrew template, same mechanism, no model involved.
  eq(followUpMessage("היי {name}, רק עוקב!", "דנה"), "היי דנה, רק עוקב!");
});

check("every offered interval is one the engine understands", () => {
  for (const interval of FOLLOW_UP_INTERVALS) {
    eq(normalizeInterval(interval), interval);
  }
});

console.log("\n— deal closure —");

check("normalizes a complete summary", () => {
  const clean = normalizeClosure({
    amount: "1200.4",
    services: "  3-month package  ",
    resolutionNotes: "Split into 2 payments",
    closedAt: "2026-08-01",
  });
  eq(clean.amount, 1200);
  eq(clean.services, "3-month package");
  eq(clean.closedAt.toISOString().slice(0, 10), "2026-08-01");
});

check("a blank amount falls back to the lead's live value", () => {
  eq(normalizeClosure({ amount: "" }, { fallbackAmount: 900 }).amount, 900);
  eq(normalizeClosure({}, { fallbackAmount: 250 }).amount, 250);
});

check("a nonsense amount is refused rather than stored as NaN", () => {
  // A NaN here would poison every revenue total that sums it.
  for (const amount of ["abc", -5, Infinity]) {
    let code = "";
    try {
      normalizeClosure({ amount });
    } catch (e) {
      code = e.code;
    }
    eq(code, "INVALID_AMOUNT", `amount ${amount}: `);
  }
});

check("backdating is allowed, forward-dating is not", () => {
  const now = Date.parse("2026-08-08T12:00:00.000Z");
  // Catching up on Friday about Tuesday's deal is normal.
  eq(
    normalizeClosure({ closedAt: "2026-08-04" }, { now }).closedAt.toISOString().slice(0, 10),
    "2026-08-04"
  );
  let code = "";
  try {
    normalizeClosure({ closedAt: "2027-01-01" }, { now });
  } catch (e) {
    code = e.code;
  }
  eq(code, "FUTURE_DATE");
});

check("prompts only on the transition into a closed state", () => {
  eq(shouldPromptForClosure({ fromStatus: "open", toStatus: "won", hasClosure: false }), true);
  eq(shouldPromptForClosure({ fromStatus: "open", toStatus: "lost", hasClosure: false }), true);
  // Still open — nothing to summarise.
  eq(shouldPromptForClosure({ fromStatus: "open", toStatus: "open", hasClosure: false }), false);
  // Already summarised: re-prompting trains people to dismiss the dialog.
  eq(shouldPromptForClosure({ fromStatus: "open", toStatus: "won", hasClosure: true }), false);
  // Moving between two won-classified stages isn't a new closure.
  eq(shouldPromptForClosure({ fromStatus: "won", toStatus: "won", hasClosure: false }), false);
});

console.log("\n— csv export —");

const HEADERS = {
  name: "Lead", outcome: "Outcome", amount: "Amount", services: "Purchased",
  notes: "Notes", closedAt: "Closed", capturedAt: "Captured", daysToClose: "Days",
  email: "Email", phone: "Phone", stage: "Stage", won: "Won", lost: "Lost",
};

check("quotes every field and escapes embedded quotes", () => {
  const csv = closedDealsCsv(
    [
      {
        name: 'Cohen, Dana "D"',
        outcome: "won",
        amount: 1200,
        services: "Package",
        resolutionNotes: "Two payments",
        closedAt: "2026-08-01T00:00:00.000Z",
        createdAt: "2026-07-01T00:00:00.000Z",
        daysToClose: 31,
        email: "d@example.com",
        phone: "+972501234567",
        stage: "won",
      },
    ],
    HEADERS
  );
  // A name containing a comma must not become two columns.
  if (!csv.includes('"Cohen, Dana ""D"""')) throw new Error("bad escaping:\n" + csv);
  if (!csv.includes('"1200"')) throw new Error("amount should be raw, not formatted");
  if (!csv.includes('"2026-08-01"')) throw new Error("date not ISO-trimmed");
});

check("starts with a BOM so Excel reads UTF-8", () => {
  // Without this, every Hebrew name in the export is mojibake on Windows.
  const csv = closedDealsCsv([], HEADERS);
  eq(csv.charCodeAt(0), 0xfeff);
});

check("uses CRLF line endings", () => {
  const csv = closedDealsCsv([{ name: "A", outcome: "lost", amount: 0 }], HEADERS);
  if (!csv.includes("\r\n")) throw new Error("no CRLF");
  eq(csv.split("\r\n").filter(Boolean).length, 2);
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);

// Platform admin: role separation, TOTP, and abuse-report validation.
//
// These are the pieces where a bug is a security incident rather than a
// cosmetic problem, and all of them are pure functions — no database, no
// browser, no session — so there's no excuse for not testing them.
import { isSuperAdmin, hasRole, SUPER_ADMIN, PLATFORM_ROLES } from "../lib/roles.js";
import {
  generateSecret,
  codeForStep,
  currentStep,
  verifyCode,
  otpauthUri,
  fromBase32,
  toBase32,
  generateRecoveryCodes,
  consumeRecoveryCode,
  hashRecoveryCode,
} from "../lib/twoFactor.js";
import { normalizeReport, looksAutomated, REPORT_REASONS } from "../lib/moderation.js";
import { isAppOwnHost, normalizeHost } from "../lib/appHost.js";

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

console.log("\n— role separation —");

check("a tenant owner is not a platform admin", () => {
  // The whole point of platformRole being a separate field: no tenant role,
  // however senior, can be mistaken for platform access.
  eq(isSuperAdmin("owner"), false);
  eq(isSuperAdmin("admin"), false);
  eq(isSuperAdmin("member"), false);
  eq(isSuperAdmin(undefined), false);
  eq(isSuperAdmin(null), false);
  eq(isSuperAdmin(""), false);
});

check("only the exact super_admin value passes", () => {
  eq(isSuperAdmin(SUPER_ADMIN), true);
  eq(isSuperAdmin("super_admin "), false);
  eq(isSuperAdmin("SUPER_ADMIN"), false);
  eq(isSuperAdmin("superadmin"), false);
});

check("the default platform role is 'none' and it grants nothing", () => {
  eq(PLATFORM_ROLES[0], "none");
  eq(isSuperAdmin("none"), false);
});

check("platform role does not leak into tenant role checks", () => {
  // A super admin with no tenant role must not pass a tenant-level gate by
  // virtue of being a platform admin — these are separate systems.
  eq(hasRole(SUPER_ADMIN, "admin"), false);
  eq(hasRole("owner", "admin"), true);
});

console.log("\n— TOTP —");

check("base32 round-trips", () => {
  const bytes = Buffer.from([0, 1, 2, 250, 255, 128, 64, 32]);
  eq(Buffer.compare(fromBase32(toBase32(bytes)), bytes), 0);
});

check("RFC 4226 test vector", () => {
  // The published HOTP vectors for the secret "12345678901234567890": at
  // counter 0 the code is 755224. TOTP is HOTP over a time-derived counter,
  // so this pins the core algorithm rather than our own idea of it.
  const secret = toBase32(Buffer.from("12345678901234567890", "ascii"));
  eq(codeForStep(secret, 0), "755224");
  eq(codeForStep(secret, 1), "287082");
  eq(codeForStep(secret, 2), "359152");
});

check("a fresh secret verifies its own current code", () => {
  const secret = generateSecret();
  const now = Date.now();
  const code = codeForStep(secret, currentStep(now));
  eq(verifyCode(secret, code, { atMs: now }), currentStep(now));
});

check("a wrong code is rejected", () => {
  const secret = generateSecret();
  eq(verifyCode(secret, "000000", { atMs: Date.now(), minStep: 0 }) === null, true);
  eq(verifyCode(secret, "", {}) === null, true);
  eq(verifyCode(secret, "12345", {}) === null, true);
  eq(verifyCode(secret, "abcdef", {}) === null, true);
});

check("±30s of clock skew is tolerated", () => {
  const secret = generateSecret();
  const now = Date.now();
  const step = currentStep(now);
  eq(verifyCode(secret, codeForStep(secret, step - 1), { atMs: now }), step - 1);
  eq(verifyCode(secret, codeForStep(secret, step + 1), { atMs: now }), step + 1);
});

check("a code two steps old is refused", () => {
  const secret = generateSecret();
  const now = Date.now();
  const step = currentStep(now);
  eq(verifyCode(secret, codeForStep(secret, step - 2), { atMs: now }), null);
});

check("a used code cannot be replayed inside its own window", () => {
  // The replay guard: minStep is set to whatever was last accepted, so the
  // same code presented a second time within its 30 seconds is dead.
  const secret = generateSecret();
  const now = Date.now();
  const step = currentStep(now);
  const code = codeForStep(secret, step);

  eq(verifyCode(secret, code, { atMs: now, minStep: 0 }), step);
  eq(verifyCode(secret, code, { atMs: now, minStep: step }), null);
});

check("one secret's code does not verify against another", () => {
  const a = generateSecret();
  const b = generateSecret();
  const now = Date.now();
  eq(verifyCode(b, codeForStep(a, currentStep(now)), { atMs: now }), null);
});

check("the otpauth URI carries what an authenticator app needs", () => {
  const uri = otpauthUri({ secret: "ABCDEFGH", accountName: "admin@example.com" });
  if (!uri.startsWith("otpauth://totp/")) throw new Error("wrong scheme: " + uri);
  for (const part of ["secret=ABCDEFGH", "issuer=Ceramony", "digits=6", "period=30"]) {
    if (!uri.includes(part)) throw new Error(`missing ${part}: ${uri}`);
  }
  // The "@" in the account name must be encoded, or the label breaks.
  if (uri.includes("admin@example.com")) throw new Error("label not encoded: " + uri);
});

console.log("\n— recovery codes —");

check("codes are stored hashed, never in the clear", () => {
  const { plain, hashed } = generateRecoveryCodes();
  eq(plain.length, 8);
  eq(hashed.length, 8);
  for (const code of plain) {
    if (hashed.includes(code)) throw new Error("a plaintext code was stored");
  }
  eq(hashed[0], hashRecoveryCode(plain[0]));
});

check("a recovery code works once and only once", () => {
  const { plain, hashed } = generateRecoveryCodes();
  const remaining = consumeRecoveryCode(hashed, plain[0]);
  eq(remaining.length, 7);
  // Second use, against the list as it now stands: gone.
  eq(consumeRecoveryCode(remaining, plain[0]), null);
});

check("an unknown recovery code is refused", () => {
  const { hashed } = generateRecoveryCodes();
  eq(consumeRecoveryCode(hashed, "AAAAA-AAAAA"), null);
  eq(consumeRecoveryCode([], "anything"), null);
});

console.log("\n— abuse reports —");

check("a known reason is accepted", () => {
  const clean = normalizeReport({ reason: "spam", notes: "  buys followers  " });
  eq(clean.reason, "spam");
  eq(clean.notes, "buys followers");
});

check("an unknown reason is refused", () => {
  let code = "";
  try {
    normalizeReport({ reason: "i-just-dont-like-them" });
  } catch (e) {
    code = e.code;
  }
  eq(code, "UNKNOWN_REASON");
});

check("'other' demands an explanation", () => {
  let code = "";
  try {
    normalizeReport({ reason: "other", notes: "   " });
  } catch (e) {
    code = e.code;
  }
  eq(code, "NOTES_REQUIRED");
  // With notes, it goes through.
  eq(normalizeReport({ reason: "other", notes: "impersonating my business" }).reason, "other");
});

check("a malformed contact email is refused", () => {
  let code = "";
  try {
    normalizeReport({ reason: "spam", reporterEmail: "not-an-email" });
  } catch (e) {
    code = e.code;
  }
  eq(code, "INVALID_EMAIL");
});

check("notes are capped", () => {
  const clean = normalizeReport({ reason: "spam", notes: "x".repeat(5000) });
  eq(clean.notes.length, 1000);
});

check("every reason the modal offers is one the server accepts", () => {
  // The modal renders REPORT_REASONS directly, so this is really asserting
  // that the list stays the single source of truth for both sides.
  for (const reason of REPORT_REASONS) {
    const notes = reason === "other" ? "explanation" : "";
    eq(normalizeReport({ reason, notes }).reason, reason);
  }
});

console.log("\n— bot heuristics —");

check("a filled honeypot looks automated", () => {
  eq(looksAutomated({ honeypot: "http://spam.example", elapsedMs: 30000 }), true);
});

check("an instant submission looks automated", () => {
  eq(looksAutomated({ honeypot: "", elapsedMs: 120 }), true);
});

check("a real person filling the form in a few seconds does not", () => {
  eq(looksAutomated({ honeypot: "", elapsedMs: 9000 }), false);
  eq(looksAutomated({ honeypot: "   ", elapsedMs: 4000 }), false);
});

check("a missing timer is not treated as a bot", () => {
  // An older cached page or a blocked timer must not stop someone reporting
  // abuse — the rate limit is what bounds that case.
  eq(looksAutomated({ honeypot: "", elapsedMs: undefined }), false);
  eq(looksAutomated({}), false);
});


console.log("\n— app host routing —");

check("normalizes hosts, ports, casing and www", () => {
  eq(normalizeHost("https://www.Ceramony.co/"), "ceramony.co");
  eq(normalizeHost("ceramony.co:3000"), "ceramony.co");
  eq(normalizeHost(""), "");
  eq(normalizeHost("not a url"), "");
});

check("recognises the configured app domain", () => {
  const env = { APP_URL: "https://ceramony.co" };
  eq(isAppOwnHost("ceramony.co", env), true);
  // www and bare are the same site to everyone except a string compare.
  eq(isAppOwnHost("www.ceramony.co", env), true);
  eq(isAppOwnHost("CERAMONY.CO", env), true);
});

check("an APP_URL on www still matches a bare visitor host", () => {
  eq(isAppOwnHost("ceramony.co", { APP_URL: "https://www.ceramony.co" }), true);
});

check("localhost and vercel previews are always ours", () => {
  eq(isAppOwnHost("localhost:3000", {}), true);
  eq(isAppOwnHost("crm-ai-agent-abc123.vercel.app", {}), true);
});

check("Vercel's own production URL counts, even without APP_URL", () => {
  eq(isAppOwnHost("ceramony.co", { VERCEL_PROJECT_PRODUCTION_URL: "ceramony.co" }), true);
});

check("a genuine tenant domain is NOT ours", () => {
  const env = { APP_URL: "https://ceramony.co" };
  eq(isAppOwnHost("dana-salon.com", env), false);
  eq(isAppOwnHost("www.dana-salon.com", env), false);
});

check("fails OPEN when nothing is configured", () => {
  // This is the regression that took ceramony.co down: with APP_URL unset,
  // the old code called the app's own domain a tenant custom domain, routed
  // it to the custom-domain lookup, found nothing, and 404'd the entire site
  // — marketing pages, login and dashboard included. One missing env var
  // must not be able to do that.
  eq(isAppOwnHost("ceramony.co", {}), true);
  eq(isAppOwnHost("anything.example", {}), true);
  // A malformed APP_URL is the same situation.
  eq(isAppOwnHost("ceramony.co", { APP_URL: "not a url" }), true);
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);

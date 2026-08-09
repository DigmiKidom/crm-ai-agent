import crypto from "node:crypto";

// TOTP (RFC 6238) on top of Node's own crypto — no new dependency.
//
// This is ~60 lines of well-specified algorithm: HMAC-SHA1 over a 30-second
// counter, truncated to 6 digits. Pulling in a package for it would add a
// supply-chain dependency to the most security-sensitive path in the product,
// which is the wrong trade at this size. It's compatible with Google
// Authenticator, 1Password, Authy, and anything else that speaks otpauth://.
//
// Server-only: imported by auth.js and the admin routes, never by a component.

const DIGITS = 6;
const PERIOD_SECONDS = 30;
// Accept the immediately preceding and following step as well as the current
// one. That's ±30s of clock skew between the server and the phone — the
// standard allowance. Wider would meaningfully extend a stolen code's life.
const WINDOW_STEPS = 1;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32, no padding — what authenticator apps expect. */
export function toBase32(buffer) {
  let bits = 0;
  let value = 0;
  let out = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function fromBase32(input) {
  const clean = String(input || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A fresh 160-bit secret, base32-encoded. */
export function generateSecret() {
  return toBase32(crypto.randomBytes(20));
}

/** Which 30-second step a timestamp falls in. */
export function currentStep(atMs = Date.now()) {
  return Math.floor(atMs / 1000 / PERIOD_SECONDS);
}

/** The 6-digit code for one secret at one step. */
export function codeForStep(secret, step) {
  const key = fromBase32(secret);
  const counter = Buffer.alloc(8);
  // Big-endian 64-bit counter. The high word is always 0 until year ~10000.
  counter.writeUInt32BE(Math.floor(step / 2 ** 32), 0);
  counter.writeUInt32BE(step >>> 0, 4);

  const hmac = crypto.createHmac("sha1", key).update(counter).digest();
  // Dynamic truncation, RFC 4226 §5.4.
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Verifies a code against a secret.
 *
 * Returns the step it matched (so the caller can persist it and refuse to
 * accept that same step again — otherwise a code shoulder-surfed or captured
 * in transit stays valid for the rest of its 30-second window), or null.
 *
 * `minStep` rejects anything at or below a previously used step.
 */
export function verifyCode(secret, code, { atMs = Date.now(), minStep = 0 } = {}) {
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length !== DIGITS || !secret) return null;

  const now = currentStep(atMs);
  for (let offset = -WINDOW_STEPS; offset <= WINDOW_STEPS; offset += 1) {
    const step = now + offset;
    if (step <= minStep) continue;
    // Constant-time compare: a timing side channel here would let an attacker
    // learn a code digit by digit.
    const expected = Buffer.from(codeForStep(secret, step));
    const actual = Buffer.from(clean);
    if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
      return step;
    }
  }
  return null;
}

/**
 * The otpauth:// URI an authenticator app enrols from. Rendered as text (and
 * as a QR code where the client can draw one) during setup.
 */
export function otpauthUri({ secret, accountName, issuer = "Ceramony" }) {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── Recovery codes ──────────────────────────────────────────────────────────

const RECOVERY_CODE_COUNT = 8;

/**
 * Single-use codes for the phone-in-the-river case. Shown once at enrolment
 * and never again — only their hashes are stored, exactly like a password.
 *
 * SHA-256 rather than bcrypt is deliberate and safe here, unlike for a
 * password: these are 40 bits of full-entropy random, not something a person
 * chose, so there's no dictionary to attack and nothing for a slow hash to
 * buy.
 */
export function generateRecoveryCodes() {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})/, "$1-")
  );
  return { plain, hashed: plain.map(hashRecoveryCode) };
}

export function hashRecoveryCode(code) {
  return crypto
    .createHash("sha256")
    .update(String(code || "").toUpperCase().replace(/[^A-F0-9]/g, ""))
    .digest("hex");
}

/**
 * Consumes one recovery code. Returns the remaining hashes when it matched,
 * or null when it didn't — the caller persists what's left, which is what
 * makes each code single-use.
 */
export function consumeRecoveryCode(hashedCodes, submitted) {
  const target = hashRecoveryCode(submitted);
  if (!Array.isArray(hashedCodes) || !hashedCodes.includes(target)) return null;
  return hashedCodes.filter((hash) => hash !== target);
}

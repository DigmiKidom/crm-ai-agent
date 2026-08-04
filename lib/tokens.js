import crypto from "crypto";
import VerificationToken from "@/lib/models/VerificationToken";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Returns the raw token — the caller puts this in the email link. Any
// existing unused token of the same type for this user is invalidated first,
// so only the most recently requested link works.
export async function createToken(userId, type) {
  const ttl = type === "reset" ? RESET_TTL_MS : VERIFY_TTL_MS;
  const rawToken = crypto.randomBytes(32).toString("hex");

  await VerificationToken.deleteMany({ userId, type });
  await VerificationToken.create({
    userId,
    type,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + ttl),
  });

  return rawToken;
}

// Looks up a token, checks it hasn't expired, and consumes it (deletes it so
// it can't be reused). Returns the userId on success, null otherwise.
export async function consumeToken(rawToken, type) {
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const record = await VerificationToken.findOneAndDelete({ tokenHash, type });

  if (!record) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  return record.userId.toString();
}

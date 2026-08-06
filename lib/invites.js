import crypto from "crypto";
import Invite from "@/lib/models/Invite";

// Same shape as reset/verification tokens (lib/tokens.js): a random raw
// token goes in the email link, only its hash is stored, so the database
// never holds anything usable on its own.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Returns the raw token — the caller puts this in the invite email link. */
export async function createInvite({ tenantId, email, role, invitedById }) {
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Only the most recently sent invite to a given email should work, same
  // rule createToken() applies to reset/verification links.
  await Invite.deleteMany({ tenantId, email, acceptedAt: null });
  await Invite.create({
    tenantId,
    email,
    role,
    tokenHash: hashToken(rawToken),
    invitedBy: invitedById,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  return rawToken;
}

/** Looks up a still-pending, unexpired invite by its raw token. */
export async function findPendingInviteByToken(rawToken) {
  if (!rawToken) return null;

  const invite = await Invite.findOne({ tokenHash: hashToken(rawToken), acceptedAt: null });
  if (!invite) return null;
  if (invite.expiresAt.getTime() < Date.now()) return null;

  return invite;
}

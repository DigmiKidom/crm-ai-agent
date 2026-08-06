import mongoose from "mongoose";

// A pending team invite. Deliberately its own document rather than a row in
// VerificationToken (lib/tokens.js): those are always tied to an EXISTING
// user's id, but an invitee has no account yet — this needs to carry
// tenantId/email/role instead, so it's a different shape, not a variant of
// the same one.
const InviteSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    // Kept after acceptance (not deleted) as a record of who joined via
    // which invite — null means still pending.
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The Settings team panel's two queries: pending invites for this tenant,
// and "is there already a pending invite for this email".
InviteSchema.index({ tenantId: 1, acceptedAt: 1 });
InviteSchema.index({ tenantId: 1, email: 1 });

export default mongoose.models.Invite || mongoose.model("Invite", InviteSchema);

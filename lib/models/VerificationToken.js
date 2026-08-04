import mongoose from "mongoose";

// Covers both password-reset and signup-verification links. Only the SHA-256
// hash of the token is stored — the raw token only ever lives in the email
// link itself — so a database leak doesn't hand out working reset links.
const VerificationTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, unique: true },
  type: { type: String, enum: ["reset", "verify"], required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// MongoDB TTL index — expired tokens get garbage-collected automatically.
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.VerificationToken ||
  mongoose.model("VerificationToken", VerificationTokenSchema);

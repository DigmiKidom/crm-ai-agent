import mongoose from "mongoose";

// Images live in their own collection rather than embedded on the Tenant doc.
// Two reasons: tenant docs stay small (so every dashboard query stays fast and
// nowhere near the 16MB BSON ceiling), and an image can be served straight from
// its own immutable URL with aggressive cache headers.
//
// Everything is compressed and resized in the browser before it ever reaches
// here (see components/ImageUpload.js), so a stored blob is typically 30–250KB.
// MAX_MEDIA_BYTES is the server-side backstop for anything that skips that path.
export const MAX_MEDIA_BYTES = 1_500_000; // 1.5MB

const MediaSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    // "logo" | "background" | "gallery" | "avatar" — lets us clean up or quota
    // by purpose later. Avatars are per-USER but still carry a tenantId, so the
    // same tenant-scoped cleanup and quota logic covers them.
    kind: {
      type: String,
      enum: ["logo", "background", "gallery", "avatar"],
      required: true,
    },
    contentType: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

// The landing page is public and hot; this keeps lookups on the read path cheap.
MediaSchema.index({ tenantId: 1, kind: 1, createdAt: -1 });

export default mongoose.models.Media || mongoose.model("Media", MediaSchema);

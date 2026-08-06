import mongoose from "mongoose";

// A timestamped record of stage changes and note edits on a Lead — the gap
// flagged repeatedly across prior docs: today's pipeline/analytics views only
// ever see a lead's CURRENT stage, never how or when it got there, so there's
// no way to answer "how long do leads sit in 'contacted'?" This is the
// unlock for that, one append-only row per change. Nothing here is ever
// edited or deleted after being written — it's a log, not a cache.
const LeadActivitySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    type: { type: String, enum: ["stage_change", "notes_updated"], required: true },
    // stage_change only:
    fromStage: { type: String, default: "" },
    toStage: { type: String, default: "" },
    // notes_updated only — snapshots the new text so the history shows how
    // notes evolved, not just that they changed.
    note: { type: String, default: "" },
    // Whoever was signed in when the change was made. Not `required`: a
    // future automated action (e.g. a webhook-driven stage move) may have no
    // human actor, and the UI falls back to a generic label either way.
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "" },
  },
  { timestamps: true }
);

// The lead detail page's timeline query: everything for one lead, oldest first.
LeadActivitySchema.index({ tenantId: 1, leadId: 1, createdAt: 1 });

export default mongoose.models.LeadActivity || mongoose.model("LeadActivity", LeadActivitySchema);

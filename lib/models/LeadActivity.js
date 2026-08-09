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
    type: {
      type: String,
      enum: [
        "lead_captured",
        "stage_change",
        "notes_updated",
        "meeting_scheduled",
        "meeting_cancelled",
        "ai_reply_drafted",
        "deal_won",
        "deal_lost",
        // The owner opened WhatsApp from the "Quick follow-up" button. Says
        // they reached out — never that the lead replied, which we can't see.
        "follow_up_sent",
      ],
      required: true,
    },
    // stage_change only:
    fromStage: { type: String, default: "" },
    toStage: { type: String, default: "" },
    // notes_updated only — snapshots the new text so the history shows how
    // notes evolved, not just that they changed.
    note: { type: String, default: "" },
    // meeting_scheduled / meeting_cancelled only — snapshotted (not just a
    // ref) so the timeline still reads correctly if the meeting itself is
    // later edited or deleted, the same reasoning customFields snapshots a
    // label on Lead.
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", default: null },
    meetingTitle: { type: String, default: "" },
    meetingStartAt: { type: Date, default: null },
    // deal_won only — the value at the moment it was marked won, snapshotted
    // so a later edit to Lead.dealValue doesn't rewrite what the timeline
    // says was actually closed.
    dealValue: { type: Number, default: null },
    // Whoever was signed in when the change was made. Not `required`: a
    // lead_captured entry has no human actor (a visitor submitting a public
    // form isn't signed in), and the UI falls back to a generic label either way.
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "" },
  },
  { timestamps: true }
);

// The lead detail page's timeline query: everything for one lead, oldest first.
LeadActivitySchema.index({ tenantId: 1, leadId: 1, createdAt: 1 });

export default mongoose.models.LeadActivity || mongoose.model("LeadActivity", LeadActivitySchema);

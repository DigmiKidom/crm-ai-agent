import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    // No longer `required: true` — a tenant can now remove the email field
    // from their form (see lib/formFields.js) and collect a phone number
    // instead. The leads API still enforces whatever fields the tenant marked
    // required at submission time; this is just no longer one of them
    // unconditionally.
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    message: { type: String, default: "" },
    // Answers to any custom fields the tenant added to their form, beyond the
    // four built-in ones above. Snapshotted with the label as it read at
    // submission time, so relabeling or removing a field later doesn't
    // corrupt how older leads display.
    customFields: {
      type: [
        {
          key: { type: String, required: true },
          label: { type: String, default: "" },
          value: { type: String, default: "" },
        },
      ],
      default: [],
    },
    source: { type: String, default: "landing-page" },
    // Which headline this visitor was shown, if the tenant is running a
    // headline A/B test when they submitted (see Tenant.landingPage.headlineVariantB).
    // null for every lead captured before this shipped, or when no test is running.
    landingVariant: { type: String, enum: ["a", "b"], default: null },
    stage: { type: String, default: "new" },
    notes: { type: String, default: "" },
    // What this deal is worth, in the tenant's own currency (Tenant.currency)
    // — set by the tenant, never by a visitor at submission time. Powers the
    // revenue/sales-trend panel on Analytics. 0 (the default) means "not
    // valued yet", not "worth nothing" — the UI treats it that way rather
    // than counting every unvalued lead as $0 of revenue.
    dealValue: { type: Number, default: 0, min: 0 },
    // Derived, never client-settable — app/api/leads/[id]/route.js recomputes
    // this from `stage` (via lib/analytics.js's classifyStages(), the same
    // won/lost inference the Analytics screen already uses) every time stage
    // changes, so it can never drift out of sync with what the pipeline board
    // actually shows. Stored anyway rather than only computed on read: it's
    // what makes "closed/won" a real, queryable status instead of a name
    // pattern re-guessed on every request.
    dealStatus: { type: String, enum: ["open", "won", "lost"], default: "open" },
    // Stamped the moment dealStatus first transitions to "won"; cleared if the
    // lead later moves out of a won stage. Lets revenue and the lead's own
    // timeline reference when a deal actually closed, not just when the lead
    // was captured.
    wonAt: { type: Date, default: null },
    // Drives the unread dot in the sidebar. Flipped to true the first time
    // the lead's detail page is opened. Existing leads have no value for this
    // field, so the unread query treats "missing" as read (see readAt below)
    // to avoid every historical lead lighting up at once after deploy.
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    // Whether this person is already in the owner's phone. Set when they use
    // "Add to contacts" (see components/AddToContactsButton.js) — it's a
    // record of an action taken in the CRM, not a claim about what's actually
    // on the device, which we have no way to read.
    contactSavedAt: { type: Date, default: null },

    // ── Follow-up engine (lib/followUp.js) ─────────────────────────────────
    //
    // The last time anything meaningful happened with this lead: captured,
    // stage moved, notes edited, a follow-up message sent. Distinct from
    // `updatedAt`, which Mongoose bumps on every write including ones that
    // aren't contact — marking a lead as read is not talking to them.
    //
    // Null on leads captured before this shipped; the flagging job falls back
    // to createdAt so historical leads are still assessed.
    lastActivityAt: { type: Date, default: null },
    // Set by the scheduled job, cleared by any real activity. Purely derived
    // — nothing is lost by recomputing it, which is what makes it safe for a
    // cron to own.
    needsFollowUp: { type: Boolean, default: false },
    followUpFlaggedAt: { type: Date, default: null },

    // ── Deal closure ───────────────────────────────────────────────────────
    //
    // Filled in by the closure modal when a lead moves to a won or lost
    // stage. Separate from `notes` (the running log of working the lead) and
    // from `dealValue` (which is the live figure the owner can edit at any
    // point): this is the record of how the deal actually ended, written once
    // at the moment it did.
    closure: {
      // What was actually sold. Free text, because "3-month package" isn't a
      // catalogue entry in a product this size.
      services: { type: String, default: "" },
      // "Split into 2 payments", "went with a competitor on price", and so on
      // — the sentence you want when you reread this in six months.
      resolutionNotes: { type: String, default: "" },
      // The date the deal closed, which is not necessarily the date it was
      // recorded — an owner catching up on Friday closes deals from Tuesday.
      closedAt: { type: Date, default: null },
      // Snapshot of the amount at closing time. dealValue stays editable;
      // this doesn't, so the closed-deals log can't be rewritten by a later
      // edit to the live field.
      amount: { type: Number, default: 0, min: 0 },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      recordedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// The sidebar badge runs this count on every dashboard render — keep it indexed.
LeadSchema.index({ tenantId: 1, read: 1 });
// The analytics page range-scans a tenant's leads by creation date (up to three
// years of them), which without this index is a full collection scan per load.
LeadSchema.index({ tenantId: 1, createdAt: -1 });
// The follow-up job scans every open lead across every tenant by activity
// date. Without this it's a full scan of the entire leads collection on each
// run — fine at ten tenants, not at ten thousand.
LeadSchema.index({ dealStatus: 1, lastActivityAt: 1 });
// The closed-deals log: one tenant's won/lost leads, most recently closed
// first.
LeadSchema.index({ tenantId: 1, dealStatus: 1, "closure.closedAt": -1 });

export default mongoose.models.Lead || mongoose.model("Lead", LeadSchema);

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
    // Drives the unread dot in the sidebar. Flipped to true the first time
    // the lead's detail page is opened. Existing leads have no value for this
    // field, so the unread query treats "missing" as read (see readAt below)
    // to avoid every historical lead lighting up at once after deploy.
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The sidebar badge runs this count on every dashboard render — keep it indexed.
LeadSchema.index({ tenantId: 1, read: 1 });
// The analytics page range-scans a tenant's leads by creation date (up to three
// years of them), which without this index is a full collection scan per load.
LeadSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.models.Lead || mongoose.model("Lead", LeadSchema);

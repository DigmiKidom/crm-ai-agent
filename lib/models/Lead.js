import mongoose from "mongoose";

const LeadSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    message: { type: String, default: "" },
    source: { type: String, default: "landing-page" },
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

export default mongoose.models.Lead || mongoose.model("Lead", LeadSchema);

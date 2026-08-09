import mongoose from "mongoose";
import { MEETING_TYPES, MEETING_STATUSES } from "@/lib/meetingConstants";

// Re-exported so route handlers that already import the model don't need a
// second import just for these — same reasoning as Tenant.js re-exporting
// MAX_FORM_FIELDS from lib/formFields.js.
export { MEETING_TYPES, MEETING_STATUSES };

// A tenant's own business calendar — meetings, calls, demos, follow-ups.
// Deliberately separate from Lead/Contact rather than an embedded array on
// either: a meeting can reference EITHER (or neither, for an internal-only
// entry), and a shared top-level collection is what makes "show me
// everything on my calendar this week" a single query instead of a scan
// across every Lead and Contact document.
const MeetingSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: MEETING_TYPES, default: "meeting" },
    status: { type: String, enum: MEETING_STATUSES, default: "confirmed" },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    allDay: { type: Boolean, default: false },

    // At most one of these is set — which CRM record (if any) this meeting
    // is about. Kept as two nullable refs rather than one polymorphic field:
    // Mongoose's own `refPath` would need a String discriminator column
    // anyway, and two plain refs are simpler to query directly ("meetings
    // for this lead") from the Lead/Contact side later.
    relatedLead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    relatedContact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },

    location: { type: String, default: "", maxlength: 300 },
    notes: { type: String, default: "", maxlength: 2000 },

    // Whoever scheduled it — surfaced once team invites mean a calendar has
    // more than one contributor. Not an authorization boundary (any
    // tenant member can see/edit any meeting, same as leads/contacts today).
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ownerName: { type: String, default: "" },
  },
  { timestamps: true }
);

// The calendar's one real query shape: "everything in this tenant that
// overlaps a date range", ordered chronologically.
MeetingSchema.index({ tenantId: 1, startAt: 1 });

export default mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);

import mongoose from "mongoose";

// One row per (tenant, day, visitor) — purely a dedup ledger, not a report
// surface itself (VisitRollup is). `visitorHash` is SHA-256 of IP + User-Agent
// + tenantId + the day's own date string (see lib/tracking.js), so it's
// stable for the SAME visitor on the SAME day (dedup works) but different
// tomorrow (no cross-day tracking of that visitor is possible from this
// value alone) — this is what makes the beacon cookieless and exempt from
// needing cookie-consent: nothing here can re-identify a return visit.
const VisitorSeenSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD", server-local (see lib/tracking.js's dateKeyFor)
    visitorHash: { type: String, required: true },
    // Two independent dedup ledgers share this one collection/index shape —
    // a visitor's first pageview AND their first CTA click each count once
    // per day, tracked separately so a visitor who clicks twice doesn't
    // inflate the click-through rate the same way a page reload doesn't
    // inflate the visit count.
    kind: { type: String, enum: ["visit", "cta_click"], default: "visit" },
  },
  { timestamps: true }
);

// The dedup mechanism itself: an insert that collides with this index is a
// repeat visit (or repeat click) within the same day and is not counted again.
VisitorSeenSchema.index({ tenantId: 1, date: 1, visitorHash: 1, kind: 1 }, { unique: true });

// Rows older than the longest analytics window (3 years) are never queried
// again — TTL-expire them so this ledger doesn't grow forever. 3y + a
// generous margin.
VisitorSeenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 4 });

export default mongoose.models.VisitorSeen || mongoose.model("VisitorSeen", VisitorSeenSchema);

import mongoose from "mongoose";

// The actual report surface: one row per (tenant, day), incremented once per
// genuinely-new unique visitor that day (see VisitorSeen — dedup happens
// there, this just holds the resulting count). This is what
// lib/analytics.js reads — a handful of small documents per tenant per
// year, not a per-visit log to scan.
const VisitRollupSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD", server-local (see lib/tracking.js's dateKeyFor)
    visits: { type: Number, default: 0 },
    // Unique visitors who clicked the landing page's CTA button at least
    // once that day — click-through rate is this divided by `visits`. Never
    // greater than `visits` by construction: a click's dedup ledger entry
    // (see VisitorSeen) only exists for a visitor who was already counted
    // as a visit.
    ctaClicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VisitRollupSchema.index({ tenantId: 1, date: 1 }, { unique: true });

export default mongoose.models.VisitRollup || mongoose.model("VisitRollup", VisitRollupSchema);

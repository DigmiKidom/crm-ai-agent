import mongoose from "mongoose";
import { REPORT_REASONS } from "@/lib/moderation";

/**
 * One abuse report about one tenant's public landing page, filed by an
 * anonymous visitor through the footer link.
 *
 * Reports are evidence, not verdicts: nothing here changes what the public
 * sees. Only a platform admin acting on the moderation queue can block a page
 * (Tenant.moderation.pageBlocked), which is what stops a competitor from
 * taking a business offline by filing reports.
 */
const PageReportSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
    // Snapshotted at report time. A tenant can rename or re-slug themselves,
    // and a report that no longer says which page it was about is useless.
    tenantSlug: { type: String, default: "" },

    reason: { type: String, enum: REPORT_REASONS, required: true },
    notes: { type: String, default: "" },
    // Optional — a reporter who wants a reply leaves one. Never shown
    // publicly and never sent to the reported tenant.
    reporterEmail: { type: String, default: "" },

    // Kept for abuse triage: a burst of reports from one address against one
    // page is the signature of a grudge, not a problem with the page. Treated
    // as personal data — see the retention note in the Terms of Use.
    reporterIp: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    status: {
      type: String,
      enum: ["open", "dismissed", "actioned"],
      default: "open",
    },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // What the admin did and why, for the audit trail.
    resolutionNote: { type: String, default: "" },
  },
  { timestamps: true }
);

// The moderation queue's default view: open reports, newest first.
PageReportSchema.index({ status: 1, createdAt: -1 });
// "Show me everything ever filed about this page", from the tenant's row.
PageReportSchema.index({ tenantId: 1, createdAt: -1 });
// Backs the per-IP duplicate check in the report endpoint.
PageReportSchema.index({ reporterIp: 1, tenantId: 1, createdAt: -1 });

export default mongoose.models.PageReport || mongoose.model("PageReport", PageReportSchema);

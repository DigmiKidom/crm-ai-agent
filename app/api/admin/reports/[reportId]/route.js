import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import PageReport from "@/lib/models/PageReport";
import Tenant from "@/lib/models/Tenant";
import { requireSuperAdmin } from "@/lib/adminSession";

/**
 * Act on one report from the moderation queue.
 *
 *   dismiss — the report was wrong or not actionable. The page stays up.
 *   ban     — the report was right. The page comes down and every other open
 *             report about it is closed in the same motion.
 *
 * Reports are never deleted either way: they're the audit trail for why a
 * page was (or wasn't) taken down.
 */
export async function PATCH(request, { params }) {
  const ctx = await requireSuperAdmin();
  if (ctx.res) return ctx.res;
  const { t, adminId } = ctx;

  const { reportId } = await params;
  if (!mongoose.isValidObjectId(reportId)) {
    return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const action = body.action === "ban" ? "ban" : body.action === "dismiss" ? "dismiss" : null;
  if (!action) {
    return NextResponse.json({ error: t("api.admin.unknownAction") }, { status: 400 });
  }

  const note = String(body.note || "").trim().slice(0, 500);

  try {
    await connectDB();

    const report = await PageReport.findById(reportId);
    if (!report) {
      return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
    }

    const wasOpen = report.status === "open";

    report.status = action === "ban" ? "actioned" : "dismissed";
    report.reviewedAt = new Date();
    report.reviewedBy = adminId;
    report.resolutionNote = note;
    await report.save();

    if (action === "ban") {
      await Tenant.updateOne(
        { _id: report.tenantId },
        {
          $set: {
            "moderation.pageBlocked": true,
            "moderation.blockedAt": new Date(),
            "moderation.blockedReason": note || report.reason,
            "moderation.blockedBy": adminId,
            "moderation.openReportCount": 0,
          },
        }
      );

      // Everything else outstanding about this page resolves with it.
      await PageReport.updateMany(
        { tenantId: report.tenantId, status: "open" },
        {
          $set: {
            status: "actioned",
            reviewedAt: new Date(),
            reviewedBy: adminId,
            resolutionNote: note,
          },
        }
      );

      const tenant = await Tenant.findById(report.tenantId).select("slug").lean();
      if (tenant) {
        // The public page is ISR-cached; drop it now rather than serving the
        // banned content for up to another minute.
        revalidatePath(`/pages/${tenant.slug}`);
        revalidatePath(`/l/${tenant.slug}`);
        revalidatePath("/custom-domain");
      }
    } else if (wasOpen) {
      // Decrementing rather than recounting: the queue badge only has to be
      // right, and $inc with a floor is one write instead of a count query.
      await Tenant.updateOne(
        { _id: report.tenantId, "moderation.openReportCount": { $gt: 0 } },
        { $inc: { "moderation.openReportCount": -1 } }
      );
    }

    return NextResponse.json({ ok: true, status: report.status });
  } catch (err) {
    console.error("Admin report action failed:", err);
    return NextResponse.json({ error: t("api.common.somethingWentWrong") }, { status: 503 });
  }
}

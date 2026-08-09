import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import PageReport from "@/lib/models/PageReport";
import { requireSuperAdmin } from "@/lib/adminSession";
import { getTenantDetail } from "@/lib/adminAnalytics";

/**
 * Block or unblock one tenant's public landing page.
 *
 * Blocking takes the page down and nothing else: the owner keeps their
 * account, their CRM, and their leads, and can still sign in. Locking the
 * person out is a separate, heavier action (see ../../users/[userId]).
 */
export async function PATCH(request, { params }) {
  const ctx = await requireSuperAdmin();
  if (ctx.res) return ctx.res;
  const { t, adminId } = ctx;

  const { tenantId } = await params;
  if (!mongoose.isValidObjectId(tenantId)) {
    return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const blocked = Boolean(body.pageBlocked);
  const reason = String(body.reason || "").trim().slice(0, 500);

  try {
    await connectDB();

    const update = blocked
      ? {
          "moderation.pageBlocked": true,
          "moderation.blockedAt": new Date(),
          "moderation.blockedReason": reason,
          "moderation.blockedBy": adminId,
        }
      : {
          "moderation.pageBlocked": false,
          "moderation.blockedAt": null,
          "moderation.blockedReason": "",
          "moderation.blockedBy": null,
        };

    const tenant = await Tenant.findByIdAndUpdate(tenantId, { $set: update }, { new: true })
      .select("slug customDomain.hostname")
      .lean();

    if (!tenant) {
      return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
    }

    // Blocking a page closes out its open reports in the same motion —
    // otherwise an admin has to action the page and then separately clear a
    // queue full of reports about the thing they just fixed.
    if (blocked) {
      await PageReport.updateMany(
        { tenantId, status: "open" },
        {
          $set: {
            status: "actioned",
            reviewedAt: new Date(),
            reviewedBy: adminId,
            resolutionNote: reason,
          },
        }
      );
      await Tenant.updateOne({ _id: tenantId }, { $set: { "moderation.openReportCount": 0 } });
    }

    // The public page is ISR-cached (revalidate = 60). Without this, a blocked
    // page would keep serving from cache for up to a minute — which is a
    // minute too long for something taken down for abuse.
    revalidatePath(`/pages/${tenant.slug}`);
    revalidatePath(`/l/${tenant.slug}`);
    if (tenant.customDomain?.hostname) revalidatePath("/custom-domain");

    return NextResponse.json({ ok: true, pageBlocked: blocked });
  } catch (err) {
    console.error("Admin tenant moderation failed:", err);
    return NextResponse.json({ error: t("api.common.somethingWentWrong") }, { status: 503 });
  }
}

/** Full detail for one tenant — the admin's inspection view. */
export async function GET(request, { params }) {
  const ctx = await requireSuperAdmin();
  if (ctx.res) return ctx.res;
  const { t } = ctx;

  const { tenantId } = await params;
  if (!mongoose.isValidObjectId(tenantId)) {
    return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
  }

  const detail = await getTenantDetail(tenantId);
  if (!detail) {
    return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...detail });
}

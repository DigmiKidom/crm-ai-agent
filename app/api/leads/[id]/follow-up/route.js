import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import LeadActivity from "@/lib/models/LeadActivity";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";
import { activityUpdate } from "@/lib/followUp";

/**
 * Marks a follow-up as sent: clears the reminder and restarts the clock.
 *
 * Called when the owner uses the "Quick follow-up" button. What it records is
 * that they reached out, not that the lead replied — we have no visibility
 * into WhatsApp, and pretending otherwise would be a lie the CRM tells its
 * owner. Concretely: the lead becomes quiet again after another full interval
 * unless something else happens, which is the correct behaviour for a message
 * that went unanswered.
 */
export async function POST(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  const { id } = await params;

  try {
    await connectDB();

    const lead = await tenantScoped(Lead, tenantId)
      .findOneAndUpdate({ _id: id }, { $set: activityUpdate() }, { new: true })
      .select("name lastActivityAt needsFollowUp")
      .lean();

    if (!lead) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }

    // Best-effort, like every other activity-log write: the timeline is an
    // audit trail, not a system of record.
    try {
      await LeadActivity.create({
        tenantId,
        leadId: id,
        type: "follow_up_sent",
        actorId: session.user.id,
        actorName: session.user.name || "",
      });
    } catch (logErr) {
      console.error("Logging follow-up activity failed:", logErr);
    }

    return NextResponse.json({ ok: true, lastActivityAt: lead.lastActivityAt });
  } catch (err) {
    console.error("Recording follow-up failed:", err);
    return NextResponse.json({ error: t("api.leads.updateFailed") }, { status: 503 });
  }
}

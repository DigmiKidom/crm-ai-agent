import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Tenant from "@/lib/models/Tenant";
import AgentSession from "@/lib/models/AgentSession";
import LeadActivity from "@/lib/models/LeadActivity";
import { draftLeadReply } from "@/lib/leadAgent";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

// Everything the draft is built from (the lead, the tenant's name/industry/
// brand-voice/content-language) is read straight from the database rather
// than trusted from the request body — there's nothing for the client to
// send here, which also means a tampered request can't steer the agent with
// fabricated lead details.
export async function POST(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  const { id } = await params;

  try {
    await connectDB();

    const lead = await tenantScoped(Lead, tenantId).findOne({ _id: id }).lean();
    if (!lead) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }

    const tenant = await Tenant.findById(tenantId)
      .select("name industry agentPreferences landingPage.language")
      .lean();
    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    const draft = await draftLeadReply({ lead, tenant });

    // Logged for the same reason every other agent call is — see AgentSession.
    try {
      await tenantScoped(AgentSession, tenantId).create({
        input: { kind: "leadReply", leadId: lead._id },
        output: draft,
      });
    } catch (logErr) {
      // Never fail the request because the audit write failed.
      console.error("Logging lead-reply agent session failed:", logErr);
    }

    // Same event, but on the LEAD's own timeline (LeadActivityTimeline) —
    // AgentSession above is the tenant-wide AI activity feed, this is what
    // makes it show up on this specific lead's detail page too.
    try {
      await LeadActivity.create({
        tenantId,
        leadId: lead._id,
        type: "ai_reply_drafted",
        actorId: session.user.id,
        actorName: session.user.name || "",
      });
    } catch (logErr) {
      console.error("Logging ai-reply-drafted activity failed:", logErr);
    }

    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    console.error("Lead-reply drafting failed:", err);
    const message = /GOOGLE_API_KEY/.test(err.message || "")
      ? t("api.leadAgent.notConfigured")
      : t("api.leadAgent.failed");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

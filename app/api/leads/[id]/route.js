import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import LeadActivity from "@/lib/models/LeadActivity";
import Pipeline from "@/lib/models/Pipeline";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";
import { classifyStages } from "@/lib/stageClassifier";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/pipelineDefaults";
import { activityUpdate } from "@/lib/followUp";
import { normalizeClosure } from "@/lib/dealClosure";

const EDITABLE_FIELDS = [
  "stage",
  "notes",
  "name",
  "email",
  "phone",
  "message",
  "read",
  "customFields",
  "dealValue",
];

// Which edits count as working the lead, for the follow-up clock. A stage
// move or a note is contact; correcting a typo in an email address, or
// marking the lead read, is not — see lib/followUp.js.
const ACTIVITY_FIELDS = ["stage", "notes"];

export async function GET(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;

  try {
    await connectDB();
    const lead = await tenantScoped(Lead, tenantId).findOne({ _id: id }).lean();
    if (!lead) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }
    return NextResponse.json({ lead });
  } catch (err) {
    console.error("Fetching lead failed:", err);
    return NextResponse.json({ error: t("api.leads.loadFailed") }, { status: 503 });
  }
}

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  const { id } = await params;
  const body = await request.json();

  // Only ever apply fields we actually allow editing, and only the ones
  // the caller actually sent — this doubles as a safe partial-update.
  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Keep the read timestamp in step with the flag rather than trusting the
  // client to send both.
  if (updates.read !== undefined) {
    updates.read = Boolean(updates.read);
    updates.readAt = updates.read ? new Date() : null;
  }

  if (updates.customFields !== undefined && !Array.isArray(updates.customFields)) {
    return NextResponse.json({ error: t("api.leads.invalidCustomFields") }, { status: 400 });
  }

  if (updates.dealValue !== undefined) {
    const value = Number(updates.dealValue);
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json({ error: t("api.leads.invalidDealValue") }, { status: 400 });
    }
    updates.dealValue = value;
  }

  try {
    await connectDB();

    // Fetched up front (not just for customFields) so a stage or notes
    // change can be diffed against what it actually replaced — the activity
    // log needs the "from", and findOneAndUpdate below only ever hands back
    // the "to".
    const current = await tenantScoped(Lead, tenantId)
      .findOne({ _id: id })
      .select("stage notes customFields dealStatus dealValue closure")
      .lean();

    if (!current) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }

    // dealStatus/wonAt are never accepted from the client (not in
    // EDITABLE_FIELDS) — they're re-derived here from whichever stage the
    // lead is moving to, using the exact same won/lost classification
    // Analytics uses, so a lead's "closed" status can never disagree with
    // what the pipeline board and revenue numbers already say about it.
    if (updates.stage !== undefined && updates.stage !== current.stage) {
      const pipeline = await tenantScoped(Pipeline, tenantId).findOne({}).select("stages").lean();
      const stages = pipeline?.stages?.length ? pipeline.stages : DEFAULT_PIPELINE_STAGES;
      const { won, lost } = classifyStages(stages);

      if (won.has(updates.stage)) {
        updates.dealStatus = "won";
        // Only stamp a fresh win time on the transition INTO a won stage —
        // moving between two different won-classified stages (a tenant with
        // more than one) shouldn't overwrite when the deal actually closed.
        if (!won.has(current.stage)) updates.wonAt = new Date();
      } else if (lost.has(updates.stage)) {
        updates.dealStatus = "lost";
        updates.wonAt = null;
      } else {
        updates.dealStatus = "open";
        updates.wonAt = null;
      }
    }

    // The deal-resolution summary, submitted by the closure modal alongside
    // the stage change. Validated here rather than trusted: `amount` becomes
    // revenue in the closed-deals log, and `closedAt` decides which month it
    // lands in.
    if (body.closure !== undefined) {
      let clean;
      try {
        clean = normalizeClosure(body.closure, {
          // Falls back to the live figure when the modal's amount is left
          // blank, so a closure recorded without one still reconciles with
          // what the lead was already worth.
          fallbackAmount: updates.dealValue ?? current.dealValue,
        });
      } catch (err) {
        return NextResponse.json(
          { error: t(`api.leads.${err.code === "FUTURE_DATE" ? "closureFutureDate" : "closureInvalidAmount"}`) },
          { status: 400 }
        );
      }

      updates.closure = {
        ...clean,
        recordedBy: session.user.id,
        recordedAt: new Date(),
      };
      // The live figure follows the closing amount, so the lead's own detail
      // page and the closed-deals log can't disagree the moment it's saved.
      updates.dealValue = clean.amount;
    }

    // A closed deal is finished business — it must never sit in the
    // follow-up queue. Cheaper and more reliable than waiting for the nightly
    // job's housekeeping pass to notice.
    if (updates.dealStatus && updates.dealStatus !== "open") {
      updates.needsFollowUp = false;
      updates.followUpFlaggedAt = null;
    }

    // Restart the quiet-period clock when this edit represents actually
    // working the lead.
    const isActivity = ACTIVITY_FIELDS.some(
      (field) => updates[field] !== undefined && updates[field] !== current[field]
    );
    if (isActivity) Object.assign(updates, activityUpdate());

    // customFields is edited as a whole array by LeadDetailEditor, but only
    // the value of each entry is ever actually changed there — re-derive key
    // and label from what's already on the document rather than trusting a
    // crafted request to introduce new keys or relabel one.
    if (updates.customFields !== undefined) {
      const byKey = new Map((current.customFields || []).map((f) => [f.key, f]));
      updates.customFields = updates.customFields
        .filter((f) => byKey.has(f?.key))
        .map((f) => ({
          key: f.key,
          label: byKey.get(f.key).label,
          value: String(f.value ?? "").slice(0, 2000),
        }));
    }

    // Scoped to the caller's tenant by construction (see tenantScoped()) so
    // no one can edit another tenant's lead just by guessing an id.
    const lead = await tenantScoped(Lead, tenantId)
      .findOneAndUpdate({ _id: id }, updates, { new: true })
      .lean();

    if (!lead) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }

    // Best-effort: the activity log is a nice-to-have audit trail, not a
    // system of record — a logging failure must never fail the save the
    // owner is actively waiting on.
    try {
      const actor = { actorId: session.user.id, actorName: session.user.name || "" };
      const entries = [];
      if (updates.stage !== undefined && updates.stage !== current.stage) {
        entries.push({
          tenantId,
          leadId: id,
          type: "stage_change",
          fromStage: current.stage,
          toStage: updates.stage,
          ...actor,
        });
      }
      if (updates.notes !== undefined && updates.notes !== current.notes) {
        entries.push({
          tenantId,
          leadId: id,
          type: "notes_updated",
          note: updates.notes.slice(0, 2000),
          ...actor,
        });
      }
      if (updates.dealStatus !== undefined && updates.dealStatus !== current.dealStatus) {
        if (updates.dealStatus === "won") {
          entries.push({
            tenantId,
            leadId: id,
            type: "deal_won",
            // The value as of this save — dealValue may have arrived in the
            // same request (LeadDetailEditor submits both together) or be
            // whatever was already on the lead.
            dealValue: updates.dealValue !== undefined ? updates.dealValue : current.dealValue,
            ...actor,
          });
        } else if (updates.dealStatus === "lost") {
          entries.push({ tenantId, leadId: id, type: "deal_lost", ...actor });
        }
      }
      if (entries.length) await LeadActivity.insertMany(entries);
    } catch (logErr) {
      console.error("Logging lead activity failed:", logErr);
    }

    return NextResponse.json({ ok: true, lead });
  } catch (err) {
    console.error("Updating lead failed:", err);
    return NextResponse.json({ error: t("api.leads.updateFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;

  try {
    await connectDB();
    const lead = await tenantScoped(Lead, tenantId).findOneAndDelete({ _id: id });
    if (!lead) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting lead failed:", err);
    return NextResponse.json({ error: t("api.leads.deleteFailed") }, { status: 503 });
  }
}

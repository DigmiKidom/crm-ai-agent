import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import LeadActivity from "@/lib/models/LeadActivity";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const EDITABLE_FIELDS = ["stage", "notes", "name", "email", "phone", "message", "read", "customFields"];

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

  try {
    await connectDB();

    // Fetched up front (not just for customFields) so a stage or notes
    // change can be diffed against what it actually replaced — the activity
    // log needs the "from", and findOneAndUpdate below only ever hands back
    // the "to".
    const current = await tenantScoped(Lead, tenantId)
      .findOne({ _id: id })
      .select("stage notes customFields")
      .lean();

    if (!current) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }

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

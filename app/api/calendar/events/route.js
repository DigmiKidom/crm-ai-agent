import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Meeting, { MEETING_TYPES, MEETING_STATUSES } from "@/lib/models/Meeting";
import Lead from "@/lib/models/Lead";
import Contact from "@/lib/models/Contact";
import LeadActivity from "@/lib/models/LeadActivity";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const MAX_TITLE = 160;
const MAX_LOCATION = 300;
const MAX_NOTES = 2000;

/** Attaches a display name for whichever CRM record (if any) each meeting references, in one batch lookup rather than one per meeting. */
async function withRelatedNames(meetings, tenantId) {
  const leadIds = [...new Set(meetings.filter((m) => m.relatedLead).map((m) => m.relatedLead.toString()))];
  const contactIds = [...new Set(meetings.filter((m) => m.relatedContact).map((m) => m.relatedContact.toString()))];

  const [leads, contacts] = await Promise.all([
    leadIds.length
      ? tenantScoped(Lead, tenantId).find({ _id: { $in: leadIds } }).select("name").lean()
      : [],
    contactIds.length
      ? tenantScoped(Contact, tenantId).find({ _id: { $in: contactIds } }).select("name").lean()
      : [],
  ]);

  const leadNames = new Map(leads.map((l) => [l._id.toString(), l.name]));
  const contactNames = new Map(contacts.map((c) => [c._id.toString(), c.name]));

  return meetings.map((m) => ({
    ...m,
    relatedName: m.relatedLead
      ? leadNames.get(m.relatedLead.toString()) || null
      : m.relatedContact
        ? contactNames.get(m.relatedContact.toString()) || null
        : null,
    relatedKind: m.relatedLead ? "lead" : m.relatedContact ? "contact" : null,
  }));
}

// Lists meetings overlapping [from, to) — an overlap query (not just
// startAt in-range) so a multi-day all-day entry that started before the
// window but hasn't ended yet still shows up.
export async function GET(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { searchParams } = new URL(request.url);
  const from = new Date(searchParams.get("from"));
  const to = new Date(searchParams.get("to"));

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: t("api.calendar.invalidRange") }, { status: 400 });
  }

  try {
    await connectDB();

    const meetings = await tenantScoped(Meeting, tenantId)
      .find({ startAt: { $lt: to }, endAt: { $gt: from } })
      .sort({ startAt: 1 })
      .lean();

    const withNames = await withRelatedNames(meetings, tenantId);

    return NextResponse.json({ events: withNames });
  } catch (err) {
    console.error("Loading calendar events failed:", err);
    return NextResponse.json({ error: t("api.calendar.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const title = String(body.title || "").trim().slice(0, MAX_TITLE);
  const type = MEETING_TYPES.includes(body.type) ? body.type : "meeting";
  const status = MEETING_STATUSES.includes(body.status) ? body.status : "confirmed";
  const allDay = Boolean(body.allDay);
  const location = String(body.location || "").trim().slice(0, MAX_LOCATION);
  const notes = String(body.notes || "").trim().slice(0, MAX_NOTES);

  if (!title) {
    return NextResponse.json({ error: t("api.calendar.titleRequired") }, { status: 400 });
  }

  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt < startAt) {
    return NextResponse.json({ error: t("api.calendar.invalidTimes") }, { status: 400 });
  }

  // At most one related record, and only one — a crafted request sending
  // both shouldn't silently pick one over the other.
  if (body.relatedLeadId && body.relatedContactId) {
    return NextResponse.json({ error: t("api.calendar.onlyOneRelated") }, { status: 400 });
  }

  let relatedLead = null;
  let relatedContact = null;

  try {
    await connectDB();

    if (body.relatedLeadId) {
      if (!mongoose.isValidObjectId(body.relatedLeadId)) {
        return NextResponse.json({ error: t("api.calendar.invalidRelated") }, { status: 400 });
      }
      // Ownership check: the referenced lead has to belong to this tenant,
      // or a crafted request could link a meeting to another tenant's lead.
      const lead = await tenantScoped(Lead, tenantId).findOne({ _id: body.relatedLeadId }).select("_id").lean();
      if (!lead) return NextResponse.json({ error: t("api.calendar.relatedNotFound") }, { status: 400 });
      relatedLead = lead._id;
    } else if (body.relatedContactId) {
      if (!mongoose.isValidObjectId(body.relatedContactId)) {
        return NextResponse.json({ error: t("api.calendar.invalidRelated") }, { status: 400 });
      }
      const contact = await tenantScoped(Contact, tenantId)
        .findOne({ _id: body.relatedContactId })
        .select("_id")
        .lean();
      if (!contact) return NextResponse.json({ error: t("api.calendar.relatedNotFound") }, { status: 400 });
      relatedContact = contact._id;
    }

    const meeting = await tenantScoped(Meeting, tenantId).create({
      title,
      type,
      status,
      startAt,
      endAt,
      allDay,
      location,
      notes,
      relatedLead,
      relatedContact,
      ownerId: session.user.id,
      ownerName: session.user.name || "",
    });

    const [withName] = await withRelatedNames([meeting.toObject()], tenantId);

    // Feeds the lead's own timeline (LeadActivityTimeline) — best-effort,
    // same as every other activity-log write in this app: a logging failure
    // must never fail the save the owner is waiting on.
    if (relatedLead) {
      try {
        await LeadActivity.create({
          tenantId,
          leadId: relatedLead,
          type: "meeting_scheduled",
          meetingId: meeting._id,
          meetingTitle: meeting.title,
          meetingStartAt: meeting.startAt,
          actorId: session.user.id,
          actorName: session.user.name || "",
        });
      } catch (logErr) {
        console.error("Logging meeting-scheduled activity failed:", logErr);
      }
    }

    return NextResponse.json({ ok: true, event: withName });
  } catch (err) {
    console.error("Creating calendar event failed:", err);
    return NextResponse.json({ error: t("api.calendar.saveFailed") }, { status: 503 });
  }
}

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

// Partial update — only fields actually present in the request are touched,
// same convention as app/api/leads/[id]/route.js. Covers everything from a
// full edit-panel save down to a one-field drag-to-reschedule (startAt/endAt
// only) or a status-only change from a quick-action menu.
export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.calendar.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const updates = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim().slice(0, MAX_TITLE);
    if (!title) return NextResponse.json({ error: t("api.calendar.titleRequired") }, { status: 400 });
    updates.title = title;
  }

  if (body.type !== undefined) {
    if (!MEETING_TYPES.includes(body.type)) {
      return NextResponse.json({ error: t("api.calendar.invalidType") }, { status: 400 });
    }
    updates.type = body.type;
  }

  if (body.status !== undefined) {
    if (!MEETING_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: t("api.calendar.invalidStatus") }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.allDay !== undefined) updates.allDay = Boolean(body.allDay);
  if (body.location !== undefined) updates.location = String(body.location).trim().slice(0, MAX_LOCATION);
  if (body.notes !== undefined) updates.notes = String(body.notes).trim().slice(0, MAX_NOTES);

  // startAt/endAt are validated together — moving just one via a partial
  // update could otherwise leave endAt before startAt transiently.
  if (body.startAt !== undefined || body.endAt !== undefined) {
    try {
      await connectDB();
      const current = await tenantScoped(Meeting, tenantId).findOne({ _id: id }).select("startAt endAt").lean();
      if (!current) return NextResponse.json({ error: t("api.calendar.notFound") }, { status: 404 });

      const startAt = body.startAt !== undefined ? new Date(body.startAt) : current.startAt;
      const endAt = body.endAt !== undefined ? new Date(body.endAt) : current.endAt;
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt < startAt) {
        return NextResponse.json({ error: t("api.calendar.invalidTimes") }, { status: 400 });
      }
      updates.startAt = startAt;
      updates.endAt = endAt;
    } catch (err) {
      console.error("Validating rescheduled times failed:", err);
      return NextResponse.json({ error: t("api.calendar.saveFailed") }, { status: 503 });
    }
  }

  if (body.relatedLeadId !== undefined && body.relatedContactId !== undefined) {
    return NextResponse.json({ error: t("api.calendar.onlyOneRelated") }, { status: 400 });
  }

  try {
    await connectDB();

    if (body.relatedLeadId !== undefined) {
      if (body.relatedLeadId === null || body.relatedLeadId === "") {
        updates.relatedLead = null;
        updates.relatedContact = null;
      } else if (!mongoose.isValidObjectId(body.relatedLeadId)) {
        return NextResponse.json({ error: t("api.calendar.invalidRelated") }, { status: 400 });
      } else {
        const lead = await tenantScoped(Lead, tenantId).findOne({ _id: body.relatedLeadId }).select("_id").lean();
        if (!lead) return NextResponse.json({ error: t("api.calendar.relatedNotFound") }, { status: 400 });
        updates.relatedLead = lead._id;
        updates.relatedContact = null;
      }
    } else if (body.relatedContactId !== undefined) {
      if (body.relatedContactId === null || body.relatedContactId === "") {
        updates.relatedLead = null;
        updates.relatedContact = null;
      } else if (!mongoose.isValidObjectId(body.relatedContactId)) {
        return NextResponse.json({ error: t("api.calendar.invalidRelated") }, { status: 400 });
      } else {
        const contact = await tenantScoped(Contact, tenantId)
          .findOne({ _id: body.relatedContactId })
          .select("_id")
          .lean();
        if (!contact) return NextResponse.json({ error: t("api.calendar.relatedNotFound") }, { status: 400 });
        updates.relatedContact = contact._id;
        updates.relatedLead = null;
      }
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
    }

    const meeting = await tenantScoped(Meeting, tenantId)
      .findOneAndUpdate({ _id: id }, updates, { new: true })
      .lean();

    if (!meeting) {
      return NextResponse.json({ error: t("api.calendar.notFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true, event: meeting });
  } catch (err) {
    console.error("Updating calendar event failed:", err);
    return NextResponse.json({ error: t("api.calendar.saveFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.calendar.notFound") }, { status: 404 });
  }

  try {
    await connectDB();
    const meeting = await tenantScoped(Meeting, tenantId).findOneAndDelete({ _id: id });
    if (!meeting) {
      return NextResponse.json({ error: t("api.calendar.notFound") }, { status: 404 });
    }

    if (meeting.relatedLead) {
      try {
        await LeadActivity.create({
          tenantId,
          leadId: meeting.relatedLead,
          type: "meeting_cancelled",
          meetingId: meeting._id,
          meetingTitle: meeting.title,
          meetingStartAt: meeting.startAt,
          actorId: session.user.id,
          actorName: session.user.name || "",
        });
      } catch (logErr) {
        console.error("Logging meeting-cancelled activity failed:", logErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting calendar event failed:", err);
    return NextResponse.json({ error: t("api.calendar.deleteFailed") }, { status: 503 });
  }
}

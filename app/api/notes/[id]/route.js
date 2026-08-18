import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Note, { MAX_NOTE_BODY, MAX_NOTE_TITLE } from "@/lib/models/Note";
import { str } from "@/lib/apiInput";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function GET(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.notes.notFound") }, { status: 404 });
  }

  try {
    await connectDB();
    const note = await tenantScoped(Note, tenantId)
      .findOne({ _id: id })
      .select("title body pinned updatedAt createdAt")
      .lean();

    if (!note) return NextResponse.json({ error: t("api.notes.notFound") }, { status: 404 });
    return NextResponse.json({ ok: true, note });
  } catch (err) {
    console.error("Loading a note failed:", err);
    return NextResponse.json({ error: t("api.notes.loadFailed") }, { status: 503 });
  }
}

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.notes.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const update = {};
  if (body.title !== undefined) update.title = str(body.title, MAX_NOTE_TITLE);
  if (body.body !== undefined) update.body = String(body.body ?? "").slice(0, MAX_NOTE_BODY);
  if (body.pinned !== undefined) update.pinned = body.pinned === true;

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
  }

  try {
    await connectDB();
    const note = await tenantScoped(Note, tenantId)
      .findOneAndUpdate({ _id: id }, { $set: update }, { new: true })
      .select("title body pinned updatedAt createdAt")
      .lean();

    if (!note) return NextResponse.json({ error: t("api.notes.notFound") }, { status: 404 });
    return NextResponse.json({ ok: true, note });
  } catch (err) {
    console.error("Updating a note failed:", err);
    return NextResponse.json({ error: t("api.notes.saveFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.notes.notFound") }, { status: 404 });
  }

  try {
    await connectDB();
    const deleted = await tenantScoped(Note, tenantId).findOneAndDelete({ _id: id });
    if (!deleted) return NextResponse.json({ error: t("api.notes.notFound") }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting a note failed:", err);
    return NextResponse.json({ error: t("api.notes.deleteFailed") }, { status: 503 });
  }
}

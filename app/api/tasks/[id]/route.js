import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Task, { MAX_TASK_TITLE, TASK_PRIORITIES } from "@/lib/models/Task";
import { dateOnly, str } from "@/lib/apiInput";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.tasks.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const update = {};

  if (body.title !== undefined) {
    const title = str(body.title, MAX_TASK_TITLE);
    if (!title) {
      return NextResponse.json({ error: t("api.tasks.titleRequired") }, { status: 400 });
    }
    update.title = title;
  }

  if (body.done !== undefined) {
    update.done = body.done === true;
    // Kept in step with the flag here rather than in a hook, so the two can
    // never disagree: a task that is done always has a completion time, and one
    // that is reopened doesn't keep a stale one.
    update.completedAt = update.done ? new Date() : null;
  }

  if (body.priority !== undefined) {
    if (!TASK_PRIORITIES.includes(body.priority)) {
      return NextResponse.json({ error: t("api.tasks.invalidPriority") }, { status: 400 });
    }
    update.priority = body.priority;
  }

  // `null` clears the date, which is why this checks for the key's presence
  // rather than for a truthy value.
  if (body.dueDate !== undefined) update.dueDate = dateOnly(body.dueDate);

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
  }

  try {
    await connectDB();
    const task = await tenantScoped(Task, tenantId)
      .findOneAndUpdate({ _id: id }, { $set: update }, { new: true })
      .select("title done completedAt priority dueDate createdAt")
      .lean();

    if (!task) {
      return NextResponse.json({ error: t("api.tasks.notFound") }, { status: 404 });
    }
    return NextResponse.json({ ok: true, task });
  } catch (err) {
    console.error("Updating a task failed:", err);
    return NextResponse.json({ error: t("api.tasks.saveFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.tasks.notFound") }, { status: 404 });
  }

  try {
    await connectDB();
    const deleted = await tenantScoped(Task, tenantId).findOneAndDelete({ _id: id });
    if (!deleted) {
      return NextResponse.json({ error: t("api.tasks.notFound") }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting a task failed:", err);
    return NextResponse.json({ error: t("api.tasks.deleteFailed") }, { status: 503 });
  }
}

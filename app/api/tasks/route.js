import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Task, { MAX_TASK_TITLE, TASK_PRIORITIES } from "@/lib/models/Task";
import { dateOnly, str } from "@/lib/apiInput";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

// How many rows the list returns. A shared to-do list that has grown past this
// has stopped being a to-do list, and an unbounded find() on a tenant's whole
// history is the kind of query that is fine until one tenant makes it not fine.
const PAGE_SIZE = 200;

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();
    const tasks = await tenantScoped(Task, tenantId)
      .find()
      // Open before done, then soonest due, then newest. Tasks with no due date
      // sort after dated ones because Mongo puts null first ascending — hence
      // the explicit createdAt tiebreak rather than relying on insertion order.
      .sort({ done: 1, dueDate: 1, createdAt: -1 })
      .limit(PAGE_SIZE)
      .select("title done completedAt priority dueDate createdAt")
      .lean();

    return NextResponse.json({ ok: true, tasks });
  } catch (err) {
    console.error("Listing tasks failed:", err);
    return NextResponse.json({ error: t("api.tasks.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId, session } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const title = str(body.title, MAX_TASK_TITLE);
  if (!title) {
    return NextResponse.json({ error: t("api.tasks.titleRequired") }, { status: 400 });
  }

  const priority = TASK_PRIORITIES.includes(body.priority) ? body.priority : "normal";

  try {
    await connectDB();
    const task = await tenantScoped(Task, tenantId).create({
      title,
      priority,
      dueDate: dateOnly(body.dueDate),
      createdBy: session.user.id,
    });

    return NextResponse.json({
      ok: true,
      task: {
        _id: task._id.toString(),
        title: task.title,
        done: task.done,
        completedAt: task.completedAt,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
      },
    });
  } catch (err) {
    console.error("Creating a task failed:", err);
    return NextResponse.json({ error: t("api.tasks.saveFailed") }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import WorkspaceItem from "@/lib/models/WorkspaceItem";
import WorkspaceRow from "@/lib/models/WorkspaceRow";
import { coerceCells } from "@/lib/workspace";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { rowId } = await params;
  if (!mongoose.isValidObjectId(rowId)) {
    return NextResponse.json({ error: t("api.workspace.rowNotFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  if (!body.cells || typeof body.cells !== "object") {
    return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
  }

  try {
    await connectDB();

    // Both the row and its parent table are matched against this tenant, so a
    // guessed row id from another tenant can't be reached even indirectly.
    const row = await tenantScoped(WorkspaceRow, tenantId).findOne({ _id: rowId }).lean();

    if (!row) {
      return NextResponse.json({ error: t("api.workspace.rowNotFound") }, { status: 404 });
    }

    const item = await tenantScoped(WorkspaceItem, tenantId)
      .findOne({ _id: row.itemId })
      .select("columns")
      .lean();

    if (!item) {
      return NextResponse.json({ error: t("api.workspace.tableNotFound") }, { status: 404 });
    }

    // Merge rather than replace: the editor saves one cell at a time, and a
    // replace would blank every other column in the row.
    const cells = { ...(row.cells || {}), ...coerceCells(body.cells, item.columns) };

    await tenantScoped(WorkspaceRow, tenantId).updateOne({ _id: rowId }, { $set: { cells } });

    return NextResponse.json({ ok: true, cells });
  } catch (err) {
    console.error("Updating workspace row failed:", err);
    return NextResponse.json({ error: t("api.workspace.saveRowFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { rowId } = await params;
  if (!mongoose.isValidObjectId(rowId)) {
    return NextResponse.json({ error: t("api.workspace.rowNotFound") }, { status: 404 });
  }

  try {
    await connectDB();

    const row = await tenantScoped(WorkspaceRow, tenantId).findOneAndDelete({ _id: rowId });

    if (!row) {
      return NextResponse.json({ error: t("api.workspace.rowNotFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting workspace row failed:", err);
    return NextResponse.json({ error: t("api.workspace.deleteRowFailed") }, { status: 503 });
  }
}

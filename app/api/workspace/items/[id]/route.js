import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import WorkspaceItem, { MAX_TITLE, MAX_CONTENT } from "@/lib/models/WorkspaceItem";
import WorkspaceRow from "@/lib/models/WorkspaceRow";
import { sanitizeColumns, coerceCells, columnsErrorMessage } from "@/lib/workspace";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.workspace.pageNotFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const updates = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: t("api.workspace.pageNeedsName") }, { status: 400 });
    if (title.length > MAX_TITLE) {
      return NextResponse.json(
        { error: t("api.workspace.pageNameTooLong", { n: MAX_TITLE }) },
        { status: 400 }
      );
    }
    updates.title = title;
  }

  if (body.content !== undefined) {
    const content = String(body.content);
    if (content.length > MAX_CONTENT) {
      return NextResponse.json({ error: t("api.workspace.documentTooLong") }, { status: 400 });
    }
    updates.content = content;
  }

  let newColumns = null;
  if (body.columns !== undefined) {
    const { columns, errorCode, errorData } = sanitizeColumns(body.columns);
    if (errorCode) {
      return NextResponse.json({ error: columnsErrorMessage(t, errorCode, errorData) }, { status: 400 });
    }
    updates.columns = columns;
    newColumns = columns;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
  }

  try {
    await connectDB();

    const item = await tenantScoped(WorkspaceItem, tenantId)
      .findOneAndUpdate({ _id: id }, { $set: updates }, { new: true })
      .lean();

    if (!item) {
      return NextResponse.json({ error: t("api.workspace.pageNotFound") }, { status: 404 });
    }

    // Changing the column set can strand cell data: a deleted column leaves
    // orphan keys, and a retyped column leaves values in the old shape. Rewrite
    // the rows through the same coercion the write path uses so what's stored
    // always matches the current columns.
    if (newColumns) {
      const rows = await tenantScoped(WorkspaceRow, tenantId)
        .find({ itemId: id })
        .select("cells")
        .lean();

      if (rows.length) {
        await WorkspaceRow.bulkWrite(
          rows.map((row) => ({
            updateOne: {
              filter: { _id: row._id },
              update: { $set: { cells: coerceCells(row.cells, newColumns) } },
            },
          }))
        );
      }
    }

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    console.error("Updating workspace item failed:", err);
    return NextResponse.json({ error: t("api.workspace.saveFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.workspace.pageNotFound") }, { status: 404 });
  }

  try {
    await connectDB();

    const item = await tenantScoped(WorkspaceItem, tenantId).findOneAndDelete({ _id: id });

    if (!item) {
      return NextResponse.json({ error: t("api.workspace.pageNotFound") }, { status: 404 });
    }

    // Rows are a separate collection, so deleting the page has to take them
    // with it or they'd linger forever with no way to reach them.
    await tenantScoped(WorkspaceRow, tenantId).deleteMany({ itemId: id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting workspace item failed:", err);
    return NextResponse.json({ error: t("api.workspace.deletePageFailed") }, { status: 503 });
  }
}

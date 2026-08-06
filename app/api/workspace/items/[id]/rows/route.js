import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import WorkspaceItem from "@/lib/models/WorkspaceItem";
import WorkspaceRow from "@/lib/models/WorkspaceRow";
import { coerceCells, emptyCell } from "@/lib/workspace";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

// Guard against a table growing unbounded — the page loads every row at once.
export const MAX_ROWS = 500;

/**
 * Replace the table's rows with the set the editor is holding.
 *
 * The table editor batches every change behind its Save button, so a save can
 * contain new rows, edited rows, and deletions all at once. Sending the desired
 * end state and reconciling here keeps that to one request instead of one per
 * row, and means a save can't half-apply.
 *
 * Rows the client already knows about carry their `_id`; new ones don't.
 * Anything absent from the payload is deleted.
 */
export async function PUT(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.workspace.pageNotFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const incoming = Array.isArray(body.rows) ? body.rows : null;

  if (!incoming) {
    return NextResponse.json({ error: t("api.workspace.expectedRowList") }, { status: 400 });
  }
  if (incoming.length > MAX_ROWS) {
    return NextResponse.json(
      { error: t("api.workspace.tooManyRows", { n: MAX_ROWS }) },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Ownership is checked on the parent item — that's what makes a guessed
    // itemId from another tenant fail here.
    const item = await tenantScoped(WorkspaceItem, tenantId)
      .findOne({ _id: id, type: "table" })
      .select("columns")
      .lean();

    if (!item) {
      return NextResponse.json({ error: t("api.workspace.tableNotFound") }, { status: 404 });
    }

    const existing = await tenantScoped(WorkspaceRow, tenantId)
      .find({ itemId: id })
      .select("_id")
      .lean();

    const existingIds = new Set(existing.map((r) => r._id.toString()));
    const blank = Object.fromEntries(item.columns.map((c) => [c.id, emptyCell(c)]));

    const keptIds = new Set();
    const updates = [];
    const inserts = [];

    incoming.forEach((row, index) => {
      const cells = { ...blank, ...coerceCells(row?.cells, item.columns) };
      const rowId = String(row?._id || "");

      // An id we don't recognise is treated as a new row rather than trusted —
      // this is what stops a crafted payload from writing into another
      // tenant's row by id.
      if (rowId && existingIds.has(rowId)) {
        keptIds.add(rowId);
        updates.push({
          updateOne: {
            filter: { _id: rowId, tenantId },
            update: { $set: { cells, order: index } },
          },
        });
      } else {
        inserts.push({
          tenantId,
          itemId: id,
          order: index,
          cells,
        });
      }
    });

    const removedIds = [...existingIds].filter((rid) => !keptIds.has(rid));

    if (removedIds.length) {
      await tenantScoped(WorkspaceRow, tenantId).deleteMany({ _id: { $in: removedIds } });
    }
    if (updates.length) await WorkspaceRow.bulkWrite(updates);
    if (inserts.length) await WorkspaceRow.insertMany(inserts);

    // Hand back the canonical rows so the editor can swap its temporary ids
    // for real ones without a second round trip.
    const rows = await tenantScoped(WorkspaceRow, tenantId)
      .find({ itemId: id })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({ _id: r._id.toString(), cells: r.cells || {} })),
    });
  } catch (err) {
    console.error("Saving workspace rows failed:", err);
    return NextResponse.json({ error: t("api.workspace.saveTableFailed") }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import WorkspaceItem from "@/lib/models/WorkspaceItem";
import WorkspaceRow from "@/lib/models/WorkspaceRow";
import { coerceCells, emptyCell } from "@/lib/workspace";

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const incoming = Array.isArray(body.rows) ? body.rows : null;

  if (!incoming) {
    return NextResponse.json({ error: "Expected a list of rows." }, { status: 400 });
  }
  if (incoming.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `A table can hold at most ${MAX_ROWS} rows.` },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Ownership is checked on the parent item — that's what makes a guessed
    // itemId from another tenant fail here.
    const item = await WorkspaceItem.findOne({
      _id: id,
      tenantId: session.user.tenantId,
      type: "table",
    })
      .select("columns")
      .lean();

    if (!item) {
      return NextResponse.json({ error: "Table not found." }, { status: 404 });
    }

    const existing = await WorkspaceRow.find({
      itemId: id,
      tenantId: session.user.tenantId,
    })
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
            filter: { _id: rowId, tenantId: session.user.tenantId },
            update: { $set: { cells, order: index } },
          },
        });
      } else {
        inserts.push({
          tenantId: session.user.tenantId,
          itemId: id,
          order: index,
          cells,
        });
      }
    });

    const removedIds = [...existingIds].filter((rid) => !keptIds.has(rid));

    if (removedIds.length) {
      await WorkspaceRow.deleteMany({
        _id: { $in: removedIds },
        tenantId: session.user.tenantId,
      });
    }
    if (updates.length) await WorkspaceRow.bulkWrite(updates);
    if (inserts.length) await WorkspaceRow.insertMany(inserts);

    // Hand back the canonical rows so the editor can swap its temporary ids
    // for real ones without a second round trip.
    const rows = await WorkspaceRow.find({ itemId: id, tenantId: session.user.tenantId })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({ _id: r._id.toString(), cells: r.cells || {} })),
    });
  } catch (err) {
    console.error("Saving workspace rows failed:", err);
    return NextResponse.json({ error: "Could not save this table." }, { status: 503 });
  }
}

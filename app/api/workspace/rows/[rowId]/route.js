import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import WorkspaceItem from "@/lib/models/WorkspaceItem";
import WorkspaceRow from "@/lib/models/WorkspaceRow";
import { coerceCells } from "@/lib/workspace";

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { rowId } = await params;
  if (!mongoose.isValidObjectId(rowId)) {
    return NextResponse.json({ error: "Row not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  if (!body.cells || typeof body.cells !== "object") {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    await connectDB();

    // Both the row and its parent table are matched against this tenant, so a
    // guessed row id from another tenant can't be reached even indirectly.
    const row = await WorkspaceRow.findOne({
      _id: rowId,
      tenantId: session.user.tenantId,
    }).lean();

    if (!row) {
      return NextResponse.json({ error: "Row not found." }, { status: 404 });
    }

    const item = await WorkspaceItem.findOne({
      _id: row.itemId,
      tenantId: session.user.tenantId,
    })
      .select("columns")
      .lean();

    if (!item) {
      return NextResponse.json({ error: "Table not found." }, { status: 404 });
    }

    // Merge rather than replace: the editor saves one cell at a time, and a
    // replace would blank every other column in the row.
    const cells = { ...(row.cells || {}), ...coerceCells(body.cells, item.columns) };

    await WorkspaceRow.updateOne(
      { _id: rowId, tenantId: session.user.tenantId },
      { $set: { cells } }
    );

    return NextResponse.json({ ok: true, cells });
  } catch (err) {
    console.error("Updating workspace row failed:", err);
    return NextResponse.json({ error: "Could not save that change." }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { rowId } = await params;
  if (!mongoose.isValidObjectId(rowId)) {
    return NextResponse.json({ error: "Row not found." }, { status: 404 });
  }

  try {
    await connectDB();

    const row = await WorkspaceRow.findOneAndDelete({
      _id: rowId,
      tenantId: session.user.tenantId,
    });

    if (!row) {
      return NextResponse.json({ error: "Row not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting workspace row failed:", err);
    return NextResponse.json({ error: "Could not delete that row." }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import WorkspaceItem, { MAX_TITLE, MAX_CONTENT } from "@/lib/models/WorkspaceItem";
import WorkspaceRow from "@/lib/models/WorkspaceRow";
import { sanitizeColumns, coerceCells } from "@/lib/workspace";

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const updates = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "The page needs a name." }, { status: 400 });
    if (title.length > MAX_TITLE) {
      return NextResponse.json(
        { error: `Page names are limited to ${MAX_TITLE} characters.` },
        { status: 400 }
      );
    }
    updates.title = title;
  }

  if (body.content !== undefined) {
    const content = String(body.content);
    if (content.length > MAX_CONTENT) {
      return NextResponse.json({ error: "That document is too long." }, { status: 400 });
    }
    updates.content = content;
  }

  let newColumns = null;
  if (body.columns !== undefined) {
    const { columns, error } = sanitizeColumns(body.columns);
    if (error) return NextResponse.json({ error }, { status: 400 });
    updates.columns = columns;
    newColumns = columns;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    await connectDB();

    const item = await WorkspaceItem.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!item) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    // Changing the column set can strand cell data: a deleted column leaves
    // orphan keys, and a retyped column leaves values in the old shape. Rewrite
    // the rows through the same coercion the write path uses so what's stored
    // always matches the current columns.
    if (newColumns) {
      const rows = await WorkspaceRow.find({ itemId: id, tenantId: session.user.tenantId })
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
    return NextResponse.json({ error: "Could not save changes." }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  try {
    await connectDB();

    const item = await WorkspaceItem.findOneAndDelete({
      _id: id,
      tenantId: session.user.tenantId,
    });

    if (!item) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    // Rows are a separate collection, so deleting the page has to take them
    // with it or they'd linger forever with no way to reach them.
    await WorkspaceRow.deleteMany({ itemId: id, tenantId: session.user.tenantId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting workspace item failed:", err);
    return NextResponse.json({ error: "Could not delete that page." }, { status: 503 });
  }
}

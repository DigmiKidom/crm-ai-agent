import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Snippet, {
  MAX_SNIPPET_BODY,
  MAX_SNIPPET_CATEGORY,
  MAX_SNIPPET_TITLE,
} from "@/lib/models/Snippet";
import { str } from "@/lib/apiInput";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.snippets.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};

  // "I just used this" is a separate operation from "I edited this": it must
  // not touch updatedAt-driven ordering the way a $set would, and it is fired
  // on every copy, so it stays a bare $inc with nothing else in the write.
  if (body.used === true) {
    try {
      await connectDB();
      const snippet = await tenantScoped(Snippet, tenantId)
        .findOneAndUpdate({ _id: id }, { $inc: { useCount: 1 } }, { new: true, timestamps: false })
        .select("useCount")
        .lean();

      if (!snippet) {
        return NextResponse.json({ error: t("api.snippets.notFound") }, { status: 404 });
      }
      return NextResponse.json({ ok: true, useCount: snippet.useCount });
    } catch (err) {
      console.error("Recording snippet use failed:", err);
      return NextResponse.json({ error: t("api.snippets.saveFailed") }, { status: 503 });
    }
  }

  const update = {};
  if (body.title !== undefined) {
    const title = str(body.title, MAX_SNIPPET_TITLE);
    if (!title) {
      return NextResponse.json({ error: t("api.snippets.titleRequired") }, { status: 400 });
    }
    update.title = title;
  }
  if (body.body !== undefined) {
    const text = String(body.body ?? "").trim().slice(0, MAX_SNIPPET_BODY);
    if (!text) {
      return NextResponse.json({ error: t("api.snippets.bodyRequired") }, { status: 400 });
    }
    update.body = text;
  }
  if (body.category !== undefined) update.category = str(body.category, MAX_SNIPPET_CATEGORY);

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
  }

  try {
    await connectDB();
    const snippet = await tenantScoped(Snippet, tenantId)
      .findOneAndUpdate({ _id: id }, { $set: update }, { new: true })
      .select("title body category useCount updatedAt")
      .lean();

    if (!snippet) {
      return NextResponse.json({ error: t("api.snippets.notFound") }, { status: 404 });
    }
    return NextResponse.json({ ok: true, snippet });
  } catch (err) {
    console.error("Updating a snippet failed:", err);
    return NextResponse.json({ error: t("api.snippets.saveFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.snippets.notFound") }, { status: 404 });
  }

  try {
    await connectDB();
    const deleted = await tenantScoped(Snippet, tenantId).findOneAndDelete({ _id: id });
    if (!deleted) {
      return NextResponse.json({ error: t("api.snippets.notFound") }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting a snippet failed:", err);
    return NextResponse.json({ error: t("api.snippets.deleteFailed") }, { status: 503 });
  }
}

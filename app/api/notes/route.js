import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Note, { MAX_NOTE_BODY, MAX_NOTE_TITLE } from "@/lib/models/Note";
import { str } from "@/lib/apiInput";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const PAGE_SIZE = 200;

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();
    // Bodies are deliberately not selected here: the list shows titles and a
    // date, and a tenant with two hundred long notes shouldn't ship every word
    // of them to render a sidebar. The editor fetches one body at a time.
    const notes = await tenantScoped(Note, tenantId)
      .find()
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(PAGE_SIZE)
      .select("title pinned updatedAt createdAt")
      .lean();

    return NextResponse.json({ ok: true, notes });
  } catch (err) {
    console.error("Listing notes failed:", err);
    return NextResponse.json({ error: t("api.notes.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId, session } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const title = str(body.title, MAX_NOTE_TITLE);
  const text = String(body.body ?? "").slice(0, MAX_NOTE_BODY);

  // A note with neither a title nor a word in it is an accidental keystroke,
  // not a document — one or the other is enough.
  if (!title && !text.trim()) {
    return NextResponse.json({ error: t("api.notes.emptyNote") }, { status: 400 });
  }

  try {
    await connectDB();
    const note = await tenantScoped(Note, tenantId).create({
      title,
      body: text,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      ok: true,
      note: {
        _id: note._id.toString(),
        title: note.title,
        body: note.body,
        pinned: note.pinned,
        updatedAt: note.updatedAt,
        createdAt: note.createdAt,
      },
    });
  } catch (err) {
    console.error("Creating a note failed:", err);
    return NextResponse.json({ error: t("api.notes.saveFailed") }, { status: 503 });
  }
}

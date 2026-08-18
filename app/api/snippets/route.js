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

const PAGE_SIZE = 200;

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();
    // Bodies are included here, unlike notes: a snippet is a couple of lines
    // and the whole point of the screen is copying one without a second click.
    const snippets = await tenantScoped(Snippet, tenantId)
      .find()
      .sort({ useCount: -1, updatedAt: -1 })
      .limit(PAGE_SIZE)
      .select("title body category useCount updatedAt")
      .lean();

    return NextResponse.json({ ok: true, snippets });
  } catch (err) {
    console.error("Listing snippets failed:", err);
    return NextResponse.json({ error: t("api.snippets.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId, session } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const title = str(body.title, MAX_SNIPPET_TITLE);
  const text = String(body.body ?? "").trim().slice(0, MAX_SNIPPET_BODY);

  if (!title) {
    return NextResponse.json({ error: t("api.snippets.titleRequired") }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: t("api.snippets.bodyRequired") }, { status: 400 });
  }

  try {
    await connectDB();
    const snippet = await tenantScoped(Snippet, tenantId).create({
      title,
      body: text,
      category: str(body.category, MAX_SNIPPET_CATEGORY),
      createdBy: session.user.id,
    });

    return NextResponse.json({
      ok: true,
      snippet: {
        _id: snippet._id.toString(),
        title: snippet.title,
        body: snippet.body,
        category: snippet.category,
        useCount: snippet.useCount,
        updatedAt: snippet.updatedAt,
      },
    });
  } catch (err) {
    console.error("Creating a snippet failed:", err);
    return NextResponse.json({ error: t("api.snippets.saveFailed") }, { status: 503 });
  }
}

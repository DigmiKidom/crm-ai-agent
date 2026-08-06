import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WorkspaceItem, { ITEM_TYPES, MAX_TITLE } from "@/lib/models/WorkspaceItem";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

// A brand-new table starts with one text column rather than none — an empty
// table with no columns has no cells to type into and reads as broken.
function starterColumns() {
  return [{ id: "c1", name: "Name", type: "text", options: [] }];
}

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();
    const items = await tenantScoped(WorkspaceItem, tenantId)
      .find()
      .select("type title icon order")
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("Listing workspace items failed:", err);
    return NextResponse.json({ error: t("api.workspace.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const title = String(body.title || "").trim();
  const type = String(body.type || "");

  if (!title) {
    return NextResponse.json({ error: t("api.workspace.pageNeedsName") }, { status: 400 });
  }
  if (title.length > MAX_TITLE) {
    return NextResponse.json(
      { error: t("api.workspace.pageNameTooLong", { n: MAX_TITLE }) },
      { status: 400 }
    );
  }
  if (!ITEM_TYPES.includes(type)) {
    return NextResponse.json({ error: t("api.workspace.choosePageType") }, { status: 400 });
  }

  try {
    await connectDB();

    // New pages go to the end of the sidebar list.
    const last = await tenantScoped(WorkspaceItem, tenantId)
      .findOne()
      .sort({ order: -1 })
      .select("order")
      .lean();

    const item = await tenantScoped(WorkspaceItem, tenantId).create({
      type,
      title,
      order: (last?.order ?? -1) + 1,
      content: "",
      columns: type === "table" ? starterColumns() : [],
    });

    return NextResponse.json({
      ok: true,
      item: {
        _id: item._id.toString(),
        type: item.type,
        title: item.title,
        order: item.order,
      },
    });
  } catch (err) {
    console.error("Creating workspace item failed:", err);
    return NextResponse.json({ error: t("api.workspace.createFailed") }, { status: 503 });
  }
}

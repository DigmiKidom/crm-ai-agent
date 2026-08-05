import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import WorkspaceItem, { ITEM_TYPES, MAX_TITLE } from "@/lib/models/WorkspaceItem";

// A brand-new table starts with one text column rather than none — an empty
// table with no columns has no cells to type into and reads as broken.
function starterColumns() {
  return [{ id: "c1", name: "Name", type: "text", options: [] }];
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const items = await WorkspaceItem.find({ tenantId: session.user.tenantId })
      .select("type title icon order")
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("Listing workspace items failed:", err);
    return NextResponse.json({ error: "Could not load your pages." }, { status: 503 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const title = String(body.title || "").trim();
  const type = String(body.type || "");

  if (!title) {
    return NextResponse.json({ error: "Give the page a name." }, { status: 400 });
  }
  if (title.length > MAX_TITLE) {
    return NextResponse.json(
      { error: `Page names are limited to ${MAX_TITLE} characters.` },
      { status: 400 }
    );
  }
  if (!ITEM_TYPES.includes(type)) {
    return NextResponse.json({ error: "Choose a page type." }, { status: 400 });
  }

  try {
    await connectDB();

    // New pages go to the end of the sidebar list.
    const last = await WorkspaceItem.findOne({ tenantId: session.user.tenantId })
      .sort({ order: -1 })
      .select("order")
      .lean();

    const item = await WorkspaceItem.create({
      tenantId: session.user.tenantId,
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
    return NextResponse.json({ error: "Could not create that page." }, { status: 503 });
  }
}

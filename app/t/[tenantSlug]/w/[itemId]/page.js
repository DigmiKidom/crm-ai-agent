import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import WorkspaceItem from "@/lib/models/WorkspaceItem";
import WorkspaceRow from "@/lib/models/WorkspaceRow";
import DocEditor from "@/components/workspace/DocEditor";
import TableEditor from "@/components/workspace/TableEditor";

export default async function WorkspaceItemPage({ params }) {
  const { tenantSlug, itemId } = await params;
  const session = await auth();

  // The layout and proxy both guard /t/*, but this page reads tenantId off the
  // session directly — bail rather than throw if it's somehow absent.
  if (!session?.user) notFound();
  if (!mongoose.isValidObjectId(itemId)) notFound();

  await connectDB();

  // Scoped to the caller's tenant, so a guessed id from another company 404s
  // rather than rendering someone else's page.
  const item = await WorkspaceItem.findOne({
    _id: itemId,
    tenantId: session.user.tenantId,
  }).lean();

  if (!item) notFound();

  if (item.type === "doc") {
    return (
      <DocEditor
        tenantSlug={tenantSlug}
        itemId={itemId}
        initialTitle={item.title}
        initialContent={item.content || ""}
      />
    );
  }

  const rows = await WorkspaceRow.find({ itemId, tenantId: session.user.tenantId })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  return (
    <TableEditor
      tenantSlug={tenantSlug}
      itemId={itemId}
      initialTitle={item.title}
      initialColumns={JSON.parse(JSON.stringify(item.columns || []))}
      initialRows={rows.map((r) => ({ _id: r._id.toString(), cells: r.cells || {} }))}
    />
  );
}

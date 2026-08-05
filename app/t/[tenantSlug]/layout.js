import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Tenant from "@/lib/models/Tenant";
import WorkspaceItem from "@/lib/models/WorkspaceItem";
import DashboardShell from "@/components/DashboardShell";

export default async function TenantDashboardLayout({ children, params }) {
  const { tenantSlug } = await params;
  const session = await auth();

  // Belt-and-suspenders: middleware already checks this, but every
  // server-rendered route re-verifies the session directly too.
  if (!session?.user) redirect("/login");
  if (session.user.tenantSlug !== tenantSlug) redirect(`/t/${session.user.tenantSlug}`);

  // Unread count for the sidebar badge. `read: false` only — leads created
  // before this feature shipped have no `read` field at all and are treated as
  // already-read, so nobody logs in to a wall of false notifications.
  let unreadLeads = 0;
  let tenant = null;
  let workspaceItems = [];
  try {
    await connectDB();
    [unreadLeads, tenant, workspaceItems] = await Promise.all([
      Lead.countDocuments({ tenantId: session.user.tenantId, read: false }),
      // Only the two fields the sidebar actually renders.
      Tenant.findById(session.user.tenantId).select("name logoMediaId").lean(),
      // The tenant's own pages, listed under the fixed nav rows.
      WorkspaceItem.find({ tenantId: session.user.tenantId })
        .select("type title order")
        .sort({ order: 1, createdAt: 1 })
        .lean(),
    ]);
  } catch (err) {
    // Neither the badge nor the logo is worth taking the whole dashboard down
    // for — fall back to the plain slug header below.
    console.error("Loading sidebar data failed:", err);
  }

  return (
    <DashboardShell
      tenantSlug={tenantSlug}
      tenantName={tenant?.name}
      logoMediaId={tenant?.logoMediaId ? tenant.logoMediaId.toString() : null}
      unreadLeads={unreadLeads}
      workspaceItems={workspaceItems.map((i) => ({
        id: i._id.toString(),
        type: i.type,
        title: i.title,
      }))}
      emailVerified={Boolean(session.user.emailVerified)}
    >
      {children}
    </DashboardShell>
  );
}

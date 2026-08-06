import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Tenant from "@/lib/models/Tenant";
import WorkspaceItem from "@/lib/models/WorkspaceItem";
import User from "@/lib/models/User";
import DashboardShell from "@/components/DashboardShell";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import { getServerLocale } from "@/lib/i18n/server";

export default async function TenantDashboardLayout({ children, params }) {
  const { tenantSlug } = await params;
  const session = await auth();

  // Read here and hand it to a nested LocaleProvider below. Without it, the
  // dashboard rendered in two languages at once: server components use
  // getServerT() and produce Hebrew, while every client component (sidebar,
  // header, forms) inherits the ROOT provider — which cannot read cookies
  // without opting the whole app out of static rendering, so it defaults to
  // English until hydration. On a slow connection that mismatch is visible.
  const locale = await getServerLocale();

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
  let profile = null;
  try {
    await connectDB();
    [unreadLeads, tenant, workspaceItems, profile] = await Promise.all([
      Lead.countDocuments({ tenantId: session.user.tenantId, read: false }),
      // Only the two fields the sidebar actually renders.
      Tenant.findById(session.user.tenantId).select("name logoMediaId").lean(),
      // The tenant's own pages, listed under the fixed nav rows.
      WorkspaceItem.find({ tenantId: session.user.tenantId })
        .select("type title order")
        .sort({ order: 1, createdAt: 1 })
        .lean(),
      // Read per-request rather than carried on the JWT: a JWT is only reissued
      // at sign-in, so a freshly uploaded avatar wouldn't appear until the user
      // logged out and back in.
      User.findById(session.user.id).select("name avatarMediaId").lean(),
    ]);
  } catch (err) {
    // Neither the badge nor the logo is worth taking the whole dashboard down
    // for — fall back to the plain slug header below.
    console.error("Loading sidebar data failed:", err);
  }

  return (
    // A nested provider: it overrides the root one for this subtree only, so
    // public pages keep their statically-rendered, cookie-free root provider.
    <LocaleProvider initialLocale={locale}>
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
      role={session.user.role}
      // The header's avatar menu renders from this rather than useSession(),
      // so it has the user's details on the server render — no post-hydration
      // pop-in on the dashboard's most visible control.
      user={{
        name: profile?.name || session.user.name || "",
        email: session.user.email || "",
        tenantSlug,
        avatarMediaId: profile?.avatarMediaId ? profile.avatarMediaId.toString() : null,
      }}
      >
        {children}
      </DashboardShell>
    </LocaleProvider>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Tenant from "@/lib/models/Tenant";
import SignOutButton from "@/components/SignOutButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import DashboardNav from "@/components/DashboardNav";
import Logo from "@/components/Logo";
import styles from "@/components/dashboard.module.css";

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
  try {
    await connectDB();
    [unreadLeads, tenant] = await Promise.all([
      Lead.countDocuments({ tenantId: session.user.tenantId, read: false }),
      // Only the two fields the sidebar actually renders.
      Tenant.findById(session.user.tenantId).select("name logoMediaId").lean(),
    ]);
  } catch (err) {
    // Neither the badge nor the logo is worth taking the whole dashboard down
    // for — fall back to the plain slug header below.
    console.error("Loading sidebar data failed:", err);
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        {/* The tenant's own logo takes the top slot once they've uploaded one;
            until then we fall back to the product mark plus their slug. */}
        <a href={`/t/${tenantSlug}/settings`} className={styles.brand} title="Company settings">
          {tenant?.logoMediaId ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`/api/media/${tenant.logoMediaId}`}
              alt={tenant.name || tenantSlug}
              className={styles.brandLogo}
            />
          ) : (
            <>
              <Logo href={null} markSize={24} iconOnly />
              <span className={styles.brandTenant}>{tenant?.name || tenantSlug}</span>
            </>
          )}
        </a>
        <DashboardNav tenantSlug={tenantSlug} unreadLeads={unreadLeads} />
        <SignOutButton className={styles.signOutButton} />
      </aside>
      <main className={styles.main}>
        {!session.user.emailVerified && <VerifyEmailBanner />}
        {children}
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
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
  try {
    await connectDB();
    unreadLeads = await Lead.countDocuments({
      tenantId: session.user.tenantId,
      read: false,
    });
  } catch (err) {
    // A badge is never worth taking the whole dashboard down for.
    console.error("Counting unread leads failed:", err);
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo href={null} markSize={24} iconOnly />
          <span className={styles.brandTenant}>{tenantSlug}</span>
        </div>
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

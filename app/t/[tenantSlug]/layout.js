import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo href={null} markSize={24} iconOnly />
          <span className={styles.brandTenant}>{tenantSlug}</span>
        </div>
        <DashboardNav tenantSlug={tenantSlug} />
        <SignOutButton className={styles.signOutButton} />
      </aside>
      <main className={styles.main}>
        {!session.user.emailVerified && <VerifyEmailBanner />}
        {children}
      </main>
    </div>
  );
}

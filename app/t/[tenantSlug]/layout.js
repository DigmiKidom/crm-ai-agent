import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignOutButton from "@/components/SignOutButton";
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
        <div className={styles.brand}>{tenantSlug}</div>
        <nav className={styles.nav}>
          <a href={`/t/${tenantSlug}`}>Leads</a>
          <a href={`/t/${tenantSlug}/pipeline`}>Pipeline</a>
          <a href={`/t/${tenantSlug}/contacts`}>Contacts</a>
          <a href={`/t/${tenantSlug}/onboarding`}>AI Setup</a>
          <a href={`/l/${tenantSlug}`} target="_blank" rel="noreferrer">
            View landing page
          </a>
        </nav>
        <SignOutButton className={styles.signOutButton} />
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

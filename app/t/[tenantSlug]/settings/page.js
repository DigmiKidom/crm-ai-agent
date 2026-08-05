import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import SettingsForm from "@/components/SettingsForm";
import styles from "@/components/dashboard.module.css";

export default async function SettingsPage({ params }) {
  const { tenantSlug } = await params;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  return (
    <div>
      <h1 className={styles.pageTitle}>Settings</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, maxWidth: 560 }}>
        Your company profile, logo, and branding. Everything here feeds your dashboard and your
        public landing page at <code>/l/{tenantSlug}</code>.
      </p>

      <SettingsForm tenant={JSON.parse(JSON.stringify(tenant))} />
    </div>
  );
}

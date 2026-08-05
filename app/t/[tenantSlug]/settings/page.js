import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import SettingsForm from "@/components/SettingsForm";
import { IconExternalLink } from "@/components/icons";
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
        public landing page at <code>/pages/{tenantSlug}</code>.
      </p>

      <div className={styles.tutorialCard}>
        <div className={styles.tutorialCardText}>
          <h2>New here?</h2>
          <p>
            A quick walkthrough of how leads flow from your landing page into your dashboard —
            takes about two minutes.
          </p>
        </div>
        <div className={styles.tutorialCardActions}>
          <a
            href={`/t/${tenantSlug}/tutorial`}
            className={styles.iconLabel}
            style={{
              padding: "8px 16px",
              border: "1px solid var(--primary)",
              borderRadius: 8,
              background: "var(--surface)",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            View tutorial <IconExternalLink size={14} />
          </a>
        </div>
      </div>

      <SettingsForm tenant={JSON.parse(JSON.stringify(tenant))} />
    </div>
  );
}

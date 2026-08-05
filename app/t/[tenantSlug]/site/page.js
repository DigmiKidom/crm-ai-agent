import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import LandingPageEditor from "@/components/LandingPageEditor";
import styles from "@/components/dashboard.module.css";

export default async function SiteEditorPage({ params }) {
  const { tenantSlug } = await params;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  return (
    <div>
      <h1 className={styles.pageTitle}>Edit landing page</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, maxWidth: 520 }}>
        Tweak the copy the AI generated without rerunning onboarding. Changes go live on{" "}
        <code>/l/{tenantSlug}</code> as soon as you save.
      </p>
      <LandingPageEditor
        tenantSlug={tenantSlug}
        landingPage={JSON.parse(JSON.stringify(tenant.landingPage))}
        hasLogo={Boolean(tenant.logoMediaId)}
        theme={JSON.parse(JSON.stringify(tenant.theme || {}))}
      />
    </div>
  );
}

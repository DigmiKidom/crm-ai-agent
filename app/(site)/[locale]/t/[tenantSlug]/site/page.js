import { getRouteT } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import LandingPageEditor from "@/components/LandingPageEditor";
import { templateList } from "@/lib/templates";
import styles from "@/components/dashboard.module.css";

export default async function SiteEditorPage({ params }) {
  const { t } = await getRouteT(params);
  const { tenantSlug } = await params;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  // Lead counts by headline variant — only queried when a test is actually
  // configured, since these are extra reads with nothing to show otherwise.
  // Counts, not a conversion rate: there's no visitor/traffic tracking yet
  // (that's a separate, larger piece of future work), so this can only ever
  // say how many leads each variant produced, not what share of visitors
  // converted — the editor labels it that way rather than implying more.
  let variantCounts = null;
  if (tenant.landingPage?.headlineVariantB) {
    const [a, b] = await Promise.all([
      Lead.countDocuments({ tenantId: tenant._id, landingVariant: "a" }),
      Lead.countDocuments({ tenantId: tenant._id, landingVariant: "b" }),
    ]);
    variantCounts = { a, b };
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("site.title")}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, maxWidth: 520 }}>
        {t("site.subtitleBefore")} <code>/pages/{tenantSlug}</code> {t("site.subtitleAfter")}
      </p>
      <LandingPageEditor
        tenantSlug={tenantSlug}
        landingPage={JSON.parse(JSON.stringify(tenant.landingPage))}
        hasLogo={Boolean(tenant.logoMediaId)}
        theme={JSON.parse(JSON.stringify(tenant.theme || {}))}
        templates={templateList()}
        templateId={tenant.templateId}
        variantCounts={variantCounts}
        social={JSON.parse(JSON.stringify(tenant.profile?.social || {}))}
      />
    </div>
  );
}

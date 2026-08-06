import { getServerT } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import OnboardingForm from "@/components/OnboardingForm";
import styles from "@/components/dashboard.module.css";

export default async function OnboardingPage({ params }) {
  const { t } = await getServerT();
  const { tenantSlug } = await params;

  // A rerun of "AI Setup" should start from what this tenant already has —
  // industry/companySize/brand-voice preferences are all persisted now (see
  // lib/agentPreferences.js), not just logged to AgentSession — rather than
  // resetting every field to the form's hardcoded defaults.
  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug })
    .select("industry companySize agentPreferences theme.primaryColor")
    .lean();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("aiSetup.title")}</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24, maxWidth: 520 }}>
        {t("onboarding.intro")}
      </p>
      <OnboardingForm
        tenantSlug={tenantSlug}
        initial={{
          industry: tenant?.industry || "",
          companySize: tenant?.companySize,
          tone: tenant?.agentPreferences?.tone,
          personality: tenant?.agentPreferences?.personality,
          style: tenant?.agentPreferences?.style,
          targetAudience: tenant?.agentPreferences?.targetAudience,
          technology: tenant?.agentPreferences?.technology,
          brandColor: tenant?.theme?.primaryColor,
        }}
      />
    </div>
  );
}

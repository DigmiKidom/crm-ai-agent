import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { getRouteT } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n/routing";
import { CORE_NAV_KEYS, normalizeEnabledPlugins } from "@/lib/plugins";
import PluginSettings from "@/components/plugins/PluginSettings";
import Link from "@/components/i18n/Link";
import { IconArrowLeft } from "@/components/icons";
import styles from "@/components/dashboard.module.css";

export const metadata = { title: "Tools & plugins" };

/**
 * Settings → Tools & plugins.
 *
 * Note there is no `hasRole(..., "admin")` gate here, unlike the settings page
 * this sits under. Everything on that page changes the business — the company
 * profile, the team, the billing plan. This changes which rows are in one
 * person's own sidebar, and locking that to admins would mean the members who
 * live in these tools all day can't choose which ones they see.
 */
export default async function ToolsSettingsPage({ params }) {
  const { t } = await getRouteT(params);
  const { locale, tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect(localePath(locale, "/login"));
  if (session.user.tenantSlug !== tenantSlug) {
    redirect(localePath(locale, `/t/${session.user.tenantSlug}`));
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("enabledPlugins").lean();

  return (
    <div>
      <Link className={`${styles.backLink} ${styles.iconLabel}`} href={`/t/${tenantSlug}/settings`}>
        <IconArrowLeft size={15} />
        {t("settings.title")}
      </Link>

      <h1 className={styles.pageTitle}>{t("plugins.pageTitle")}</h1>
      <p className={styles.sectionHint}>{t("plugins.pageIntro")}</p>

      <PluginSettings
        initialEnabled={normalizeEnabledPlugins(user?.enabledPlugins)}
        // Translated on the server so the client component doesn't need the
        // core list, only the labels it renders.
        coreLabels={CORE_NAV_KEYS.map((key) => t(`plugins.core.${key}`))}
      />
    </div>
  );
}

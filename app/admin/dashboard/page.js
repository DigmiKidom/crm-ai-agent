import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerT } from "@/lib/i18n/server";
import { getSuperAdminPageContext } from "@/lib/adminSession";
import { getPlatformStats } from "@/lib/adminAnalytics";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import styles from "@/components/admin/admin.module.css";

// Always fresh: an admin looking at "open reports" needs the number that's
// true right now, not one cached at build time.
export const dynamic = "force-dynamic";

function Stat({ label, value, sub, alert = false }) {
  return (
    <div className={`${styles.stat} ${alert ? styles.statAlert : ""}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  // Re-checked per page, not just in the layout: Next can reuse a cached
  // layout across a soft navigation, so a page that reads cross-tenant data
  // verifies for itself rather than inheriting someone else's check.
  if (!(await getSuperAdminPageContext())) notFound();

  const { t, locale } = await getServerT();
  const { totals, signupSeries, leadSeries } = await getPlatformStats({ days: 30, locale });

  const n = (value) => new Intl.NumberFormat(locale).format(value);

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("admin.dashboard.title")}</h1>
      <p className={styles.pageHint}>{t("admin.dashboard.subtitle")}</p>

      <div className={styles.statGrid}>
        <Stat
          label={t("admin.stats.users")}
          value={n(totals.users)}
          sub={t("admin.stats.usersSub", { n: n(totals.signups7) })}
        />
        <Stat
          label={t("admin.stats.livePages")}
          value={n(totals.livePages)}
          sub={t("admin.stats.livePagesSub", { n: n(totals.tenants) })}
        />
        <Stat
          label={t("admin.stats.leads")}
          value={n(totals.leads)}
          sub={t("admin.stats.leadsSub", { n: n(totals.leads7) })}
        />
        <Stat
          label={t("admin.stats.activeTenants")}
          value={n(totals.activeTenants30)}
          sub={t("admin.stats.activeTenantsSub")}
        />
        <Stat
          label={t("admin.stats.openReports")}
          value={n(totals.openReports)}
          sub={t("admin.stats.openReportsSub")}
          alert={totals.openReports > 0}
        />
        <Stat
          label={t("admin.stats.blockedPages")}
          value={n(totals.blockedPages)}
          sub={t("admin.stats.blockedPagesSub", { n: n(totals.suspendedUsers) })}
          alert={totals.blockedPages > 0}
        />
      </div>

      {totals.openReports > 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t("admin.dashboard.needsAttention")}</h2>
          <p className={styles.pageHint} style={{ marginBottom: 12 }}>
            {t("admin.dashboard.needsAttentionBody", { n: n(totals.openReports) })}
          </p>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/admin/reports">
            {t("admin.dashboard.openQueue")}
          </Link>
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t("admin.dashboard.signupsChart")}</h2>
        <TimeSeriesChart
          points={signupSeries}
          valueLabel={t("admin.dashboard.signupsLabel")}
          emptyMessage={t("admin.dashboard.noData")}
        />
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t("admin.dashboard.leadsChart")}</h2>
        <TimeSeriesChart
          points={leadSeries}
          valueLabel={t("admin.dashboard.leadsLabel")}
          emptyMessage={t("admin.dashboard.noData")}
        />
      </div>
    </div>
  );
}

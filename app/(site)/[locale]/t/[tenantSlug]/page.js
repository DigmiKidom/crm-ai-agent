import { getRouteT } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Contact from "@/lib/models/Contact";
import Pipeline from "@/lib/models/Pipeline";
import {
  IconInbox,
  IconUsers,
  IconPipeline,
  IconClock,
  IconArrowRight,
  IconChart,
} from "@/components/icons";
import Sparkline from "@/components/charts/Sparkline";
import styles from "@/components/dashboard.module.css";
import Link from "@/components/i18n/Link";

export default async function OverviewPage({ params }) {
  const { tenantSlug } = await params;
  // This route is already dynamic (the layout calls auth()), so reading the
  // locale cookie here costs nothing extra.
  const { t } = await getRouteT(params);

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  const [leads, contactCount, pipeline] = await Promise.all([
    Lead.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).lean(),
    Contact.countDocuments({ tenantId: tenant._id }),
    Pipeline.findOne({ tenantId: tenant._id }).lean(),
  ]);

  const stages = pipeline?.stages || ["new", "contacted", "qualified", "won", "lost"];
  const stageCounts = stages.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
  }));
  const recentLeads = leads.slice(0, 5);
  const maxStageCount = Math.max(1, ...stageCounts.map((s) => s.count));

  // A 30-day trend for the overview card. The full breakdown lives on the
  // analytics page; this is just enough shape to make the number worth a click.
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const from = new Date(dayStart);
    from.setDate(from.getDate() - (29 - i));
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return leads.filter((l) => {
      const ts = new Date(l.createdAt);
      return ts >= from && ts < to;
    }).length;
  });
  const leadsLast30 = last30.reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("overview.title")}</h1>
      <p style={{ color: "var(--muted)", marginTop: -16, marginBottom: 24, fontSize: "0.9rem" }}>
        {tenant?.name
          ? t("overview.welcome", { company: tenant.name })
          : t("overview.welcomeGeneric")}
      </p>

      <div className={styles.statGrid}>
        <Link href={`/t/${tenantSlug}/leads`} className={styles.statCard}>
          <IconInbox size={22} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>{leads.length}</div>
            <div className={styles.statLabel}>{t("overview.totalLeads")}</div>
          </div>
        </Link>
        <Link href={`/t/${tenantSlug}/contacts`} className={styles.statCard}>
          <IconUsers size={22} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>{contactCount}</div>
            <div className={styles.statLabel}>{t("overview.contacts")}</div>
          </div>
        </Link>
        <Link href={`/t/${tenantSlug}/pipeline`} className={styles.statCard}>
          <IconPipeline size={22} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>{stages.length}</div>
            <div className={styles.statLabel}>{t("overview.pipelineStages")}</div>
          </div>
        </Link>
        <Link href={`/t/${tenantSlug}/analytics`} className={styles.statCard}>
          <IconChart size={22} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>{leadsLast30}</div>
            <div className={styles.statLabel}>{t("overview.last30Days")}</div>
          </div>
          <div style={{ marginInlineStart: "auto" }}>
            <Sparkline values={last30} width={64} height={26} />
          </div>
        </Link>
      </div>

      <div className={styles.overviewColumns}>
        <div className={styles.overviewPanel}>
          <h2 className={styles.panelTitle}>{t("overview.leadsByStage")}</h2>
          {leads.length === 0 ? (
            <p className={styles.empty}>{t("overview.noLeads")}</p>
          ) : (
            <div className={styles.stageBars}>
              {stageCounts.map(({ stage, count }) => (
                <div key={stage} className={styles.stageBarRow}>
                  <span className={styles.stageBarLabel}>{stage}</span>
                  <div className={styles.stageBarTrack}>
                    <div
                      className={styles.stageBarFill}
                      style={{ width: `${(count / maxStageCount) * 100}%` }}
                    />
                  </div>
                  <span className={styles.stageBarCount}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.overviewPanel}>
          <h2 className={styles.panelTitle}>
            <IconClock size={16} style={{ verticalAlign: "-3px", marginInlineEnd: 6 }} />
            {t("overview.recentLeads")}
          </h2>
          {recentLeads.length === 0 ? (
            <p className={styles.empty}>
              {t("overview.noLeadsHint", { url: `/pages/${tenantSlug}` })}
            </p>
          ) : (
            <ul className={styles.recentList}>
              {recentLeads.map((lead) => (
                <li key={lead._id}>
                  <Link href={`/t/${tenantSlug}/leads/${lead._id}`} className={styles.recentItem}>
                    <div>
                      <div className={styles.recentName}>{lead.name}</div>
                      <div className={styles.recentMeta}>
                        {lead.stage} · {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <IconArrowRight size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/t/${tenantSlug}/leads`} className={styles.linkButton} style={{ marginTop: 12, display: "inline-block" }}>
            {t("overview.viewAllLeads")}
          </Link>
        </div>
      </div>
    </div>
  );
}

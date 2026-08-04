import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Contact from "@/lib/models/Contact";
import Pipeline from "@/lib/models/Pipeline";
import { IconInbox, IconUsers, IconPipeline, IconClock, IconArrowRight } from "@/components/icons";
import styles from "@/components/dashboard.module.css";

export default async function OverviewPage({ params }) {
  const { tenantSlug } = await params;

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

  return (
    <div>
      <h1 className={styles.pageTitle}>Overview</h1>
      <p style={{ color: "var(--muted)", marginTop: -16, marginBottom: 24, fontSize: "0.9rem" }}>
        Welcome back to {tenant?.name || "your"} CRM.
      </p>

      <div className={styles.statGrid}>
        <a href={`/t/${tenantSlug}/leads`} className={styles.statCard}>
          <IconInbox size={22} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>{leads.length}</div>
            <div className={styles.statLabel}>Total leads</div>
          </div>
        </a>
        <a href={`/t/${tenantSlug}/contacts`} className={styles.statCard}>
          <IconUsers size={22} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>{contactCount}</div>
            <div className={styles.statLabel}>Contacts</div>
          </div>
        </a>
        <a href={`/t/${tenantSlug}/pipeline`} className={styles.statCard}>
          <IconPipeline size={22} className={styles.statIcon} />
          <div>
            <div className={styles.statValue}>{stages.length}</div>
            <div className={styles.statLabel}>Pipeline stages</div>
          </div>
        </a>
      </div>

      <div className={styles.overviewColumns}>
        <div className={styles.overviewPanel}>
          <h2 className={styles.panelTitle}>Leads by stage</h2>
          {leads.length === 0 ? (
            <p className={styles.empty}>No leads yet.</p>
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
            <IconClock size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            Recent leads
          </h2>
          {recentLeads.length === 0 ? (
            <p className={styles.empty}>
              No leads yet. Share your landing page (/l/{tenantSlug}) to start collecting them.
            </p>
          ) : (
            <ul className={styles.recentList}>
              {recentLeads.map((lead) => (
                <li key={lead._id}>
                  <a href={`/t/${tenantSlug}/leads/${lead._id}`} className={styles.recentItem}>
                    <div>
                      <div className={styles.recentName}>{lead.name}</div>
                      <div className={styles.recentMeta}>
                        {lead.stage} · {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <IconArrowRight size={16} />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a href={`/t/${tenantSlug}/leads`} className={styles.linkButton} style={{ marginTop: 12, display: "inline-block" }}>
            View all leads
          </a>
        </div>
      </div>
    </div>
  );
}

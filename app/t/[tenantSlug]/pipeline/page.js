import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import styles from "@/components/dashboard.module.css";

export default async function PipelinePage({ params }) {
  const { tenantSlug } = await params;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
  const [leads, pipeline] = await Promise.all([
    Lead.find({ tenantId: tenant._id }).lean(),
    Pipeline.findOne({ tenantId: tenant._id }).lean(),
  ]);

  const stages = pipeline?.stages || ["new", "contacted", "qualified", "won", "lost"];

  return (
    <div>
      <h1 className={styles.pageTitle}>Pipeline</h1>
      <div className={styles.pipelineBoard}>
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage);
          return (
            <div className={styles.pipelineColumn} key={stage}>
              <h3>
                {stage} ({stageLeads.length})
              </h3>
              {stageLeads.map((lead) => (
                <div className={styles.pipelineCard} key={lead._id}>
                  <strong>{lead.name}</strong>
                  <div>{lead.email}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

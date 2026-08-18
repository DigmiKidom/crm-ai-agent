import { getRouteT } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import PipelineBoard from "@/components/PipelineBoard";
import PipelineStagesEditor from "@/components/PipelineStagesEditor";
import styles from "@/components/dashboard.module.css";

export default async function PipelinePage({ params }) {
  const { t } = await getRouteT(params);
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
      <h1 className={styles.pageTitle}>{t("pipeline.title")}</h1>
      <PipelineStagesEditor tenantSlug={tenantSlug} stages={stages} />
      <PipelineBoard
        initialLeads={JSON.parse(JSON.stringify(leads))}
        stages={stages}
        tenantSlug={tenantSlug}
        whatsappTemplate={tenant.outreach?.whatsappTemplate || ""}
        companyName={tenant.name}
        currency={tenant.currency}
      />
    </div>
  );
}

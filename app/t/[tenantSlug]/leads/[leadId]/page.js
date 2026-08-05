import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import MarkLeadRead from "@/components/MarkLeadRead";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import LeadDetailEditor from "@/components/LeadDetailEditor";
import styles from "@/components/dashboard.module.css";

export default async function LeadDetailPage({ params }) {
  const { tenantSlug, leadId } = await params;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
  if (!tenant) notFound();

  const [lead, pipeline] = await Promise.all([
    Lead.findOne({ _id: leadId, tenantId: tenant._id }).lean(),
    Pipeline.findOne({ tenantId: tenant._id }).lean(),
  ]);

  if (!lead) notFound();

  const stages = pipeline?.stages || ["new", "contacted", "qualified", "won", "lost"];

  return (
    <div>
      <a className={styles.backLink} href={`/t/${tenantSlug}/leads`}>
        &larr; Back to leads
      </a>
      <h1 className={styles.pageTitle}>{lead.name}</h1>

      {/* Opening this page is what "reading" a lead means. Done from the client
          so the sidebar badge can be refreshed straight after — a server-side
          write here couldn't revalidate the layout mid-render. */}
      {lead.read === false && <MarkLeadRead leadId={lead._id.toString()} />}

      <LeadDetailEditor lead={JSON.parse(JSON.stringify(lead))} stages={stages} tenantSlug={tenantSlug} />
    </div>
  );
}

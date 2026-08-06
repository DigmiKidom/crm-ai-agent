import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import MarkLeadRead from "@/components/MarkLeadRead";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import LeadActivity from "@/lib/models/LeadActivity";
import LeadDetailEditor from "@/components/LeadDetailEditor";
import LeadActivityTimeline from "@/components/LeadActivityTimeline";
import { getServerT } from "@/lib/i18n/server";
import styles from "@/components/dashboard.module.css";

export default async function LeadDetailPage({ params }) {
  const { t, locale } = await getServerT();
  const { tenantSlug, leadId } = await params;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
  if (!tenant) notFound();

  const [lead, pipeline] = await Promise.all([
    Lead.findOne({ _id: leadId, tenantId: tenant._id }).lean(),
    Pipeline.findOne({ tenantId: tenant._id }).lean(),
  ]);

  if (!lead) notFound();

  // Oldest first — reads as a story of how the lead moved, not a changelog.
  const activity = await LeadActivity.find({ tenantId: tenant._id, leadId: lead._id })
    .sort({ createdAt: 1 })
    .lean();

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

      <div style={{ marginTop: 24 }}>
        <LeadActivityTimeline activity={JSON.parse(JSON.stringify(activity))} t={t} locale={locale} />
      </div>
    </div>
  );
}

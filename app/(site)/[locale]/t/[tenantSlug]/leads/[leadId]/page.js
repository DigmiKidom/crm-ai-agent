import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import MarkLeadRead from "@/components/MarkLeadRead";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import LeadActivity from "@/lib/models/LeadActivity";
import LeadDetailEditor from "@/components/LeadDetailEditor";
import LeadActivityTimeline from "@/components/LeadActivityTimeline";
import LeadWhatsAppLink from "@/components/LeadWhatsAppLink";
import AddToContactsButton from "@/components/AddToContactsButton";
import QuickFollowUpButton from "@/components/QuickFollowUpButton";
import { getRouteT } from "@/lib/i18n/server";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/pipelineDefaults";
import { IconArrowLeft } from "@/components/icons";
import styles from "@/components/dashboard.module.css";
import Link from "@/components/i18n/Link";

export default async function LeadDetailPage({ params }) {
  const { t, locale } = await getRouteT(params);
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

  const stages = pipeline?.stages?.length ? pipeline.stages : DEFAULT_PIPELINE_STAGES;

  return (
    <div>
      <Link className={`${styles.backLink} ${styles.iconLabel}`} href={`/t/${tenantSlug}/leads`}>
        <IconArrowLeft size={13} className="dirFlip" />
        {t("leads.backToLeads")}
      </Link>
      <div className={styles.leadTitleRow}>
        <h1 className={styles.pageTitle}>{lead.name}</h1>
        {/* Labelled here, icon-only in the list: this is the page you land on
            when you've decided to actually reply to someone. */}
        <span className={styles.rowActions}>
          {lead.phone && (
            <AddToContactsButton
              lead={JSON.parse(JSON.stringify(lead))}
              businessName={tenant.name}
            />
          )}
          {lead.needsFollowUp && (
            <QuickFollowUpButton
              lead={{ _id: lead._id.toString(), name: lead.name, phone: lead.phone }}
              template={tenant.outreach?.followUpTemplate}
            />
          )}
          <LeadWhatsAppLink
            lead={JSON.parse(JSON.stringify(lead))}
            template={tenant.outreach?.whatsappTemplate}
            companyName={tenant.name}
            label={t("leads.whatsappReply")}
            withLabel
          />
        </span>
      </div>

      {lead.needsFollowUp && (
        <p className={styles.followUpNotice} role="status">
          {t("leads.followUpNotice")}
        </p>
      )}

      {/* Opening this page is what "reading" a lead means. Done from the client
          so the sidebar badge can be refreshed straight after — a server-side
          write here couldn't revalidate the layout mid-render. */}
      {lead.read === false && <MarkLeadRead leadId={lead._id.toString()} />}

      <LeadDetailEditor
        lead={JSON.parse(JSON.stringify(lead))}
        stages={stages}
        tenantSlug={tenantSlug}
        currency={tenant.currency}
      />

      <div style={{ marginTop: 24 }}>
        <LeadActivityTimeline
          activity={JSON.parse(JSON.stringify(activity))}
          t={t}
          locale={locale}
          currency={tenant.currency}
        />
      </div>
    </div>
  );
}

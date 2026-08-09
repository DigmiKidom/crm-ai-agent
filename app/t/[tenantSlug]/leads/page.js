import { getServerT } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import Pipeline from "@/lib/models/Pipeline";
import StageSelect from "@/components/StageSelect";
import LeadWhatsAppLink from "@/components/LeadWhatsAppLink";
import AddToContactsButton from "@/components/AddToContactsButton";
import QuickFollowUpButton from "@/components/QuickFollowUpButton";
import { IconFilter, IconClose, IconCheck } from "@/components/icons";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/pipelineDefaults";
import styles from "@/components/dashboard.module.css";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function LeadsInboxPage({ params, searchParams }) {
  const { t } = await getServerT();
  const { tenantSlug } = await params;
  const { q = "", stage = "", from = "", to = "" } = (await searchParams) || {};

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  const filter = { tenantId: tenant._id };
  if (q.trim()) {
    filter.name = { $regex: escapeRegex(q.trim()), $options: "i" };
  }
  if (stage.trim()) {
    filter.stage = stage.trim();
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [leads, pipeline] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).lean(),
    Pipeline.findOne({ tenantId: tenant._id }).lean(),
  ]);

  const stages = pipeline?.stages?.length ? pipeline.stages : DEFAULT_PIPELINE_STAGES;
  const hasFilters = q.trim() || stage.trim() || from || to;

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("leads.title")}</h1>

      <form
        method="GET"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}
      >
        <div className={styles.detailField} style={{ marginBottom: 0, minWidth: 180 }}>
          <label htmlFor="q">{t("leads.searchByName")}</label>
          <input id="q" name="q" defaultValue={q} placeholder={t("leads.searchPlaceholder")} />
        </div>
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="stage">{t("leads.stage")}</label>
          <select id="stage" name="stage" defaultValue={stage}>
            <option value="">{t("leads.allStages")}</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="from">{t("leads.from")}</label>
          <input id="from" type="date" name="from" defaultValue={from} />
        </div>
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="to">{t("leads.to")}</label>
          <input id="to" type="date" name="to" defaultValue={to} />
        </div>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`}>
          <IconFilter size={14} />
          {t("leads.filter")}
        </button>
        {hasFilters && (
          <a className={`${styles.linkButton} ${styles.iconLabel}`} href={`/t/${tenantSlug}/leads`}>
            <IconClose size={13} />
            {t("leads.clearFilters")}
          </a>
        )}
      </form>

      {leads.length === 0 ? (
        <p className={styles.empty}>
          {hasFilters ? t("leads.noMatch") : t("leads.noneYet", { slug: tenantSlug })}
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("leads.name")}</th>
              <th>{t("leads.email")}</th>
              <th>{t("leads.phone")}</th>
              <th>{t("leads.stage")}</th>
              <th>{t("leads.received")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id} className={lead.read === false ? styles.rowUnread : ""}>
                <td>
                  {lead.read === false && (
                    <span className={styles.unreadDot} title={t("leads.unreadLead")} aria-label={t("leads.unread")} />
                  )}
                  {lead.name}
                  {lead.dealStatus === "won" && (
                    <span className={styles.wonBadge} title={t("leads.dealStatus.won")}>
                      <IconCheck size={11} />
                    </span>
                  )}
                  <span className={styles.leadBadges}>
                    {/* Only for someone with a number worth saving, and only
                        until they've been saved once. */}
                    {lead.phone && !lead.contactSavedAt && (
                      <span className={styles.unsavedBadge}>{t("leads.newContact")}</span>
                    )}
                    {lead.needsFollowUp && (
                      <span className={styles.followUpBadge}>{t("leads.pendingFollowUp")}</span>
                    )}
                  </span>
                </td>
                <td>{lead.email}</td>
                <td>
                  <span className={styles.phoneCell}>
                    {lead.phone || "—"}
                    <LeadWhatsAppLink
                      lead={lead}
                      template={tenant.outreach?.whatsappTemplate}
                      companyName={tenant.name}
                      label={t("leads.whatsapp", { name: lead.name })}
                    />
                  </span>
                </td>
                <td>
                  <StageSelect
                    leadId={lead._id.toString()}
                    lead={{
                      name: lead.name,
                      dealValue: lead.dealValue,
                      closure: lead.closure ? { closedAt: lead.closure.closedAt } : null,
                    }}
                    stage={lead.stage}
                    stages={stages}
                    currency={tenant.currency}
                  />
                </td>
                <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={styles.rowActions}>
                    <a className={styles.linkButton} href={`/t/${tenantSlug}/leads/${lead._id}`}>
                      {t("leads.view")}
                    </a>
                    {lead.phone && !lead.contactSavedAt && (
                      <AddToContactsButton
                        lead={JSON.parse(JSON.stringify(lead))}
                        businessName={tenant.name}
                        compact
                      />
                    )}
                    {lead.needsFollowUp && (
                      <QuickFollowUpButton
                        lead={{ _id: lead._id.toString(), name: lead.name, phone: lead.phone }}
                        template={tenant.outreach?.followUpTemplate}
                        compact
                      />
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

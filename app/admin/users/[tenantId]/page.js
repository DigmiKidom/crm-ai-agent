import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { getServerT } from "@/lib/i18n/server";
import { getSuperAdminPageContext } from "@/lib/adminSession";
import { getTenantDetail } from "@/lib/adminAnalytics";
import { IconArrowLeft, IconExternalLink } from "@/components/icons";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

function Detail({ label, children }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * One business, inspected.
 *
 * Shows what a moderator needs to judge a page — the business, its people,
 * how active its CRM is, and every report ever filed about it — and
 * deliberately not the contents of its CRM. Lead names, emails and messages
 * belong to that business's customers; being a platform admin isn't a reason
 * to read them. See the note in lib/adminAnalytics.js.
 */
export default async function AdminTenantDetailPage({ params }) {
  // This page shows one business's published content and team; see the note
  // in app/admin/dashboard/page.js for why the layout's check isn't enough.
  if (!(await getSuperAdminPageContext())) notFound();

  const { t, locale } = await getServerT();
  const { tenantId } = await params;

  if (!mongoose.isValidObjectId(tenantId)) notFound();

  const detail = await getTenantDetail(tenantId);
  if (!detail) notFound();

  const { tenant, members, crm, reports } = detail;
  const date = (value) =>
    value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

  return (
    <div>
      <Link className={styles.backLink} href="/admin/users">
        <IconArrowLeft size={13} className="dirFlip" />
        {t("admin.detail.back")}
      </Link>

      <h1 className={styles.pageTitle}>{tenant.name}</h1>
      <p className={styles.pageHint}>
        <span className={styles.mono}>/{tenant.slug}</span>
        {tenant.moderation.pageBlocked && (
          <>
            {" · "}
            <span className={`${styles.pill} ${styles.pillDanger}`}>{t("admin.users.statusBlocked")}</span>
          </>
        )}
      </p>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t("admin.detail.business")}</h2>
        <dl className={styles.detailGrid}>
          <Detail label={t("admin.detail.industry")}>{tenant.industry || "—"}</Detail>
          <Detail label={t("admin.detail.plan")}>{tenant.plan}</Detail>
          <Detail label={t("admin.detail.template")}>{tenant.templateId}</Detail>
          <Detail label={t("admin.detail.created")}>{date(tenant.createdAt)}</Detail>
          <Detail label={t("admin.detail.customDomain")}>{tenant.customDomain || "—"}</Detail>
          <Detail label={t("admin.detail.publicPage")}>
            <a href={`/pages/${tenant.slug}`} target="_blank" rel="noreferrer noopener">
              <IconExternalLink size={12} /> /pages/{tenant.slug}
            </a>
          </Detail>
        </dl>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t("admin.detail.pageContent")}</h2>
        <dl className={styles.detailGrid}>
          <Detail label={t("admin.detail.headline")}>{tenant.headline || "—"}</Detail>
          <Detail label={t("admin.detail.subheadline")}>{tenant.subheadline || "—"}</Detail>
        </dl>
        {tenant.moderation.pageBlocked && (
          <p className={styles.warn} style={{ marginTop: 14 }}>
            {t("admin.detail.blockedNote", {
              date: date(tenant.moderation.blockedAt),
              reason: tenant.moderation.blockedReason || t("admin.detail.noReason"),
            })}
          </p>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t("admin.detail.crmActivity")}</h2>
        <div className={styles.statGrid} style={{ marginBottom: 0 }}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t("admin.detail.totalLeads")}</span>
            <span className={styles.statValue}>{crm.totalLeads}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t("admin.detail.leads30")}</span>
            <span className={styles.statValue}>{crm.leads30}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t("admin.detail.lastLead")}</span>
            <span className={styles.statSub} style={{ marginTop: 8, fontSize: "0.95rem" }}>
              {date(crm.lastLeadAt)}
            </span>
          </div>
        </div>
        <p className={styles.subtle} style={{ marginTop: 14 }}>
          {t("admin.detail.privacyNote")}
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t("admin.detail.people")}</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("admin.detail.person")}</th>
              <th>{t("admin.detail.role")}</th>
              <th>{t("admin.detail.verified")}</th>
              <th>{t("admin.detail.status")}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <span className={styles.primaryCell}>
                    <strong>{member.name || "—"}</strong>
                    <span className={styles.subtle}>{member.email}</span>
                  </span>
                </td>
                <td>{member.role}</td>
                <td className={styles.subtle}>
                  {member.emailVerified ? t("admin.detail.yes") : t("admin.detail.no")}
                </td>
                <td>
                  {member.suspended ? (
                    <span className={`${styles.pill} ${styles.pillDanger}`}>
                      {t("admin.users.statusSuspended")}
                    </span>
                  ) : (
                    <span className={`${styles.pill} ${styles.pillOk}`}>{t("admin.detail.active")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          {t("admin.detail.reportHistory")} ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className={styles.empty}>{t("admin.detail.noReports")}</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("admin.reports.filed")}</th>
                <th>{t("admin.reports.reason")}</th>
                <th>{t("admin.reports.notes")}</th>
                <th>{t("admin.reports.status")}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className={styles.subtle}>{date(report.createdAt)}</td>
                  <td>{t(`report.reasons.${report.reason}`)}</td>
                  <td>{report.notes || "—"}</td>
                  <td>
                    <span className={styles.pill}>{t(`admin.reports.statuses.${report.status}`)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getRouteT } from "@/lib/i18n/server";
import { getSuperAdminPageContext } from "@/lib/adminSession";
import { listReports } from "@/lib/adminAnalytics";
import AdminReportQueue from "@/components/admin/AdminReportQueue";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function AdminReportsPage({ params, searchParams }) {
  // See the note in app/admin/dashboard/page.js.
  if (!(await getSuperAdminPageContext())) notFound();

  const { t, locale } = await getRouteT(params);
  const { status = "open", page = "1" } = (await searchParams) || {};

  const result = await listReports({ status, page: Number(page) || 1, perPage: PER_PAGE });
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("admin.reports.title")}</h1>
      <p className={styles.pageHint}>{t("admin.reports.subtitle")}</p>

      <form className={styles.toolbar} method="GET">
        <div className={styles.searchField} style={{ flex: "0 0 200px", minWidth: 0 }}>
          <label htmlFor="status">{t("admin.reports.show")}</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="open">{t("admin.reports.statuses.open")}</option>
            <option value="dismissed">{t("admin.reports.statuses.dismissed")}</option>
            <option value="actioned">{t("admin.reports.statuses.actioned")}</option>
            <option value="all">{t("admin.reports.showAll")}</option>
          </select>
        </div>
        <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
          {t("admin.users.apply")}
        </button>
      </form>

      <div className={styles.card} style={{ padding: 0, overflowX: "auto" }}>
        <AdminReportQueue
          rows={result.rows.map((row) => ({
            ...row,
            createdAtLabel: formatter.format(new Date(row.createdAt)),
          }))}
        />
      </div>

      <div className={styles.pagination}>
        <span>{t("admin.users.showing", { shown: result.rows.length, total: result.total })}</span>
      </div>
    </div>
  );
}

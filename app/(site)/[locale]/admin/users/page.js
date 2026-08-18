import { notFound } from "next/navigation";
import { getRouteT } from "@/lib/i18n/server";
import { getSuperAdminPageContext } from "@/lib/adminSession";
import { listTenants } from "@/lib/adminAnalytics";
import AdminTenantTable from "@/components/admin/AdminTenantTable";
import styles from "@/components/admin/admin.module.css";
import Link from "@/components/i18n/Link";

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function AdminUsersPage({ params, searchParams }) {
  // See the note in app/admin/dashboard/page.js — every page that reads
  // cross-tenant data checks for itself.
  if (!(await getSuperAdminPageContext())) notFound();

  const { t, locale } = await getRouteT(params);
  const { q = "", status = "all", page = "1" } = (await searchParams) || {};

  const result = await listTenants({
    query: q,
    status,
    page: Number(page) || 1,
    perPage: PER_PAGE,
  });

  const pageCount = Math.max(1, Math.ceil(result.total / PER_PAGE));

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("admin.users.title")}</h1>
      <p className={styles.pageHint}>{t("admin.users.subtitle")}</p>

      {/* A plain GET form, not a client-side search box: the result is a URL
          an admin can bookmark, share with a colleague, or reload after
          acting on a row. */}
      <form className={styles.toolbar} method="GET">
        <div className={styles.searchField}>
          <label htmlFor="q">{t("admin.users.search")}</label>
          <input id="q" name="q" defaultValue={q} placeholder={t("admin.users.searchPlaceholder")} />
        </div>
        <div className={styles.searchField} style={{ flex: "0 0 190px", minWidth: 0 }}>
          <label htmlFor="status">{t("admin.users.filter")}</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="all">{t("admin.users.filterAll")}</option>
            <option value="reported">{t("admin.users.filterReported")}</option>
            <option value="blocked">{t("admin.users.filterBlocked")}</option>
          </select>
        </div>
        <button className={`${styles.button} ${styles.buttonPrimary}`} type="submit">
          {t("admin.users.apply")}
        </button>
      </form>

      <div className={styles.card} style={{ padding: 0, overflowX: "auto" }}>
        <AdminTenantTable
          rows={result.rows.map((row) => ({
            ...row,
            createdAtLabel: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
              new Date(row.createdAt)
            ),
          }))}
        />
      </div>

      <div className={styles.pagination}>
        <span>{t("admin.users.showing", { shown: result.rows.length, total: result.total })}</span>
        <span className={styles.rowActions}>
          {result.page > 1 && (
            <Link
              className={styles.button}
              href={`/admin/users?q=${encodeURIComponent(q)}&status=${status}&page=${result.page - 1}`}
            >
              {t("admin.users.previous")}
            </Link>
          )}
          {result.page < pageCount && (
            <Link
              className={styles.button}
              href={`/admin/users?q=${encodeURIComponent(q)}&status=${status}&page=${result.page + 1}`}
            >
              {t("admin.users.next")}
            </Link>
          )}
        </span>
      </div>
    </div>
  );
}

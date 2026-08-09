import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { getServerT } from "@/lib/i18n/server";
import { getClosedDeals } from "@/lib/closedDeals";
import { formatMoney } from "@/lib/money";
import PrintButton from "@/components/PrintButton";
import { IconDownload, IconCheck, IconClose } from "@/components/icons";
import styles from "@/components/dashboard.module.css";

export const dynamic = "force-dynamic";

/**
 * The closed-deals log: every decided deal, what it was worth, and what was
 * actually sold.
 *
 * Separate from Analytics on purpose. Analytics is about trend — it buckets
 * by capture date and answers "is this improving". This is a ledger: ordered
 * by closing date, exportable, and meant to be read a row at a time by
 * someone doing their books.
 */
export default async function ClosedDealsPage({ params, searchParams }) {
  const { t, locale } = await getServerT();
  const { tenantSlug } = await params;
  const { from = "", to = "", outcome = "all" } = (await searchParams) || {};

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).select("name currency").lean();

  const { rows, totals } = await getClosedDeals(tenant._id, { from, to, outcome });

  const currency = tenant.currency || "USD";
  const money = (amount) => formatMoney(amount, currency, locale);
  const date = (value) =>
    value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value)) : "—";

  const exportQuery = new URLSearchParams({ from, to, outcome }).toString();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("closedDeals.title")}</h1>
      <p className={styles.sectionHint} style={{ marginBottom: 20 }}>
        {t("closedDeals.subtitle")}
      </p>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t("closedDeals.revenue")}</span>
          <span className={styles.statValue}>{money(totals.revenue)}</span>
          <span className={styles.sectionHint}>
            {t("closedDeals.revenueSub", { n: totals.won })}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t("closedDeals.avgDeal")}</span>
          <span className={styles.statValue}>
            {totals.avgDealSize === null ? "—" : money(totals.avgDealSize)}
          </span>
          <span className={styles.sectionHint}>
            {totals.avgDealSize === null
              ? t("closedDeals.avgDealNone")
              : t("closedDeals.avgDealSub", { n: totals.valuedWon })}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t("closedDeals.winRate")}</span>
          <span className={styles.statValue}>
            {totals.winRate === null ? "—" : `${totals.winRate}%`}
          </span>
          <span className={styles.sectionHint}>
            {t("closedDeals.winRateSub", { won: totals.won, decided: totals.decided })}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t("closedDeals.avgDays")}</span>
          <span className={styles.statValue}>
            {totals.avgDaysToClose === null ? "—" : totals.avgDaysToClose}
          </span>
          <span className={styles.sectionHint}>{t("closedDeals.avgDaysSub")}</span>
        </div>
      </div>

      <form
        method="GET"
        className={styles.noPrint}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}
      >
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="from">{t("leads.from")}</label>
          <input id="from" type="date" name="from" defaultValue={from} />
        </div>
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="to">{t("leads.to")}</label>
          <input id="to" type="date" name="to" defaultValue={to} />
        </div>
        <div className={styles.detailField} style={{ marginBottom: 0 }}>
          <label htmlFor="outcome">{t("closedDeals.outcome")}</label>
          <select id="outcome" name="outcome" defaultValue={outcome}>
            <option value="all">{t("closedDeals.outcomeAll")}</option>
            <option value="won">{t("leads.dealStatus.won")}</option>
            <option value="lost">{t("leads.dealStatus.lost")}</option>
          </select>
        </div>
        <button type="submit" className={styles.saveButton}>
          {t("leads.filter")}
        </button>
        <a
          className={`${styles.linkButton} ${styles.iconLabel}`}
          href={`/api/leads/closed-deals/export?${exportQuery}`}
        >
          <IconDownload size={13} />
          {t("closedDeals.exportCsv")}
        </a>
        {/* PDF via the browser's own print-to-PDF, like the CV builder does:
            the on-screen table IS the printed page (see .noPrint above), so
            there's no second layout to keep in sync and no PDF library. */}
        <PrintButton label={t("closedDeals.exportPdf")} />
      </form>

      {rows.length === 0 ? (
        <p className={styles.empty}>{t("closedDeals.empty")}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("closedDeals.csv.name")}</th>
              <th>{t("closedDeals.csv.outcome")}</th>
              <th>{t("closedDeals.csv.amount")}</th>
              <th>{t("closedDeals.csv.services")}</th>
              <th>{t("closedDeals.csv.notes")}</th>
              <th>{t("closedDeals.csv.closedAt")}</th>
              <th>{t("closedDeals.csv.daysToClose")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <a className={styles.linkButton} href={`/t/${tenantSlug}/leads/${row.id}`}>
                    {row.name}
                  </a>
                </td>
                <td>
                  {row.outcome === "won" ? (
                    <span className={`${styles.pill} ${styles.pillWon}`}>
                      <IconCheck size={11} />
                      {t("leads.dealStatus.won")}
                    </span>
                  ) : (
                    <span className={`${styles.pill} ${styles.pillLost}`}>
                      <IconClose size={11} />
                      {t("leads.dealStatus.lost")}
                    </span>
                  )}
                </td>
                <td>{row.outcome === "won" ? money(row.amount) : "—"}</td>
                <td>{row.services || "—"}</td>
                <td style={{ maxWidth: 280 }}>{row.resolutionNotes || "—"}</td>
                <td>{date(row.closedAt)}</td>
                <td>{row.daysToClose ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

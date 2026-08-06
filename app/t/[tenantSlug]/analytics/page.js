import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { getServerT } from "@/lib/i18n/server";
import { getAnalytics, RANGES, DEFAULT_RANGE } from "@/lib/analytics";
import RangePicker from "@/components/RangePicker";
import DeltaBadge from "@/components/DeltaBadge";
import Sparkline from "@/components/charts/Sparkline";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import HBarList from "@/components/charts/HBarList";
import FunnelBars from "@/components/charts/FunnelBars";
import Heatmap from "@/components/charts/Heatmap";
import {
  IconChart,
  IconTarget,
  IconClock,
  IconForm,
  IconCalendar,
  IconUsers,
  IconPipeline,
  IconInbox,
  IconFlame,
  IconAlert,
  IconInfo,
  IconTrendUp,
} from "@/components/icons";
import styles from "@/components/analytics.module.css";
import dash from "@/components/dashboard.module.css";



// Reporting should reflect a lead captured thirty seconds ago, so this page
// opts out of the route cache entirely rather than serving a stale snapshot.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const { range: rangeParam } = (await searchParams) ?? {};

  const { t, locale } = await getServerT();

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.tenantSlug !== tenantSlug) redirect(`/t/${session.user.tenantSlug}`);

  // Unknown values in the URL fall back rather than 404 — a hand-edited or
  // stale bookmarked ?range= shouldn't break the page.
  const range = RANGES[rangeParam] ? rangeParam : DEFAULT_RANGE;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).select("name").lean();
  const data = await getAnalytics({ tenantId: session.user.tenantId, range, t, locale });

  const basePath = `/t/${tenantSlug}/analytics`;
  const { totals, timing, formStats } = data;

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={dash.pageTitle} style={{ marginBottom: 0 }}>
            {t("analytics.title")}
          </h1>
          <p className={styles.subtitle}>
            {t("analytics.insights.subtitle", {
              caption: t(`analytics.range.${range}Caption`),
              company: tenant?.name || tenantSlug,
              total: totals.leadsAllTime,
            })}
          </p>
        </div>
        <RangePicker basePath={basePath} active={range} t={t} />
      </div>

      {totals.leadsAllTime === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateTitle}>{t("analytics.noLeads")}</div>
          Every chart on this page is built from the leads your landing page captures. Share{" "}
          <strong>/pages/{tenantSlug}</strong> and the reporting fills in from the first submission.
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------------- KPIs */}
          <div className={styles.kpiGrid}>
            {data.kpis.map((kpi) => (
              <div
                key={kpi.key}
                className={`${styles.kpiCard} ${kpi.tone === "warn" ? styles.kpiCardWarn : ""}`}
              >
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>{kpi.label}</span>
                  <DeltaBadge value={kpi.delta} t={t} />
                </div>
                <div className={styles.kpiValue}>{kpi.value}</div>
                {kpi.spark && <Sparkline values={kpi.spark} />}
                <div className={styles.kpiHint}>{kpi.hint}</div>
              </div>
            ))}
          </div>

          {/* ------------------------------------------------ leads over time */}
          <div className={styles.panelGridWide}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconChart size={16} />
                  {t("analytics.panel.leadsReceived")}
                </h2>
                <span className={styles.panelNote}>
                  {t("analytics.panel.dashedPrev", {
                    bucket: t(data.range.bucket === "day" ? "analytics.panel.daily" : "analytics.panel.monthly"),
                    period: t(`analytics.range.prev${range === "3y" ? "3y" : range.charAt(0).toUpperCase() + range.slice(1)}`),
                  })}
                </span>
              </div>
              <TimeSeriesChart points={data.leadsOverTime} valueLabel={t("analytics.panel.leadsUnit")} />
            </section>
          </div>

          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconTrendUp size={16} />
                  {t("analytics.panel.cumulative")}
                </h2>
                <span className={styles.panelNote}>{t("analytics.panel.runningTotal")}</span>
              </div>
              <TimeSeriesChart points={data.cumulative} valueLabel={t("analytics.panel.leadsTotalUnit")} />
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconTarget size={16} />
                  Outcomes
                </h2>
                <span className={styles.panelNote}>
                  {totals.winRate != null ? `${totals.winRate}% win rate` : t("analytics.panel.nothingDecided")}
                </span>
              </div>
              <DonutChart slices={data.outcomes} centerLabel="leads" />
              <div className={styles.panelFooter}>
                {t("analytics.panel2.winRateNote")}
              </div>
            </section>
          </div>

          {/* ------------------------------------------------------- pipeline */}
          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconPipeline size={16} />
                  {t("analytics.panel2.whereLeadsSit")}
                </h2>
                <span className={styles.panelNote}>{t("analytics.panel.stageOccupancy")}</span>
              </div>
              <FunnelBars stages={data.stageDistribution} />
              <div className={styles.panelFooter}>
                {t("analytics.panel2.stageNote")}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconTarget size={16} />
                  {t("analytics.panel2.winRateOverTime")}
                </h2>
                <span className={styles.panelNote}>{t("analytics.panel.ofDecided")}</span>
              </div>
              <TimeSeriesChart
                points={data.winRateOverTime}
                valueLabel={t("analytics.panel.winRateUnit")}
                unit="%"
                emptyMessage={t("analytics.panel.noFinalStage")}
              />
              <div className={styles.panelFooter}>
                {t("analytics.panel.gapsNote")}
              </div>
            </section>
          </div>

          {/* -------------------------------------------------- responsiveness */}
          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconClock size={16} />
                  {t("analytics.panel2.speedToFirst")}
                </h2>
                <span className={styles.panelNote}>{t("analytics.panel.timeToFirstOpen")}</span>
              </div>
              <HBarList rows={data.responseBreakdown} mode="max" />
              <div className={styles.panelFooter}>
                {t("analytics.panel2.speedNote")}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconAlert size={16} />
                  {t("analytics.panel2.backlog")}
                </h2>
                <span className={styles.panelNote}>
                  {totals.backlog} waiting · all time, not just this period
                </span>
              </div>
              <HBarList
                rows={data.backlogAging}
                mode="max"
                showShare={false}
                emptyMessage={t("analytics.panel.nothingWaiting")}
              />
              <div className={styles.panelFooter}>
                {t("analytics.panel2.backlogNote")}
              </div>
            </section>
          </div>

          {/* ------------------------------------------------------ form stats */}
          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconForm size={16} />
                  {t("analytics.panel2.formSubmissions")}
                </h2>
                <span className={styles.panelNote}>{t("analytics.panel.whatVisitorsFill")}</span>
              </div>
              <div className={styles.miniStats}>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>{formStats.total}</span>
                  <span className={styles.miniStatLabel}>{t("analytics.panel.formsSubmitted")}</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>{formStats.completionRate}%</span>
                  <span className={styles.miniStatLabel}>{t("analytics.panel.filledEveryField")}</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>{formStats.avgFields}</span>
                  <span className={styles.miniStatLabel}>{t("analytics.panel.avgFieldsOf4")}</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>{formStats.avgMessageLength}</span>
                  <span className={styles.miniStatLabel}>{t("analytics.panel.avgMessageChars")}</span>
                </div>
              </div>
              <HBarList rows={data.formCompleteness} mode="share" />
              <div className={styles.panelFooter}>
                {t("analytics.panel2.completionNote")}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconInbox size={16} />
                  {t("analytics.panel2.leadSources")}
                </h2>
                <span className={styles.panelNote}>{t("analytics.panel.whereFrom")}</span>
              </div>
              <DonutChart slices={data.sources} centerLabel="leads" />
              <div className={styles.panelFooter}>
                Everything captured by your landing page form is tagged{" "}
                <strong>landing-page</strong>. Leads added another way carry their own source.
              </div>
            </section>
          </div>

          {/* --------------------------------------------------------- timing */}
          <div className={styles.panelGridWide}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconFlame size={16} />
                  {t("analytics.panel2.whenArrive")}
                </h2>
                <span className={styles.panelNote}>
                  {timing.busiestDay
                    ? `Busiest: ${timing.busiestDay}${timing.busiestHour ? ` around ${timing.busiestHour}` : ""} · ${timing.businessHoursShare}% arrive in business hours`
                    : t("analytics.panel.notEnoughData")}
                </span>
              </div>
              <Heatmap grid={data.heatmap} />
            </section>
          </div>

          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconCalendar size={16} />
                  {t("analytics.panel2.byDayOfWeek")}
                </h2>
              </div>
              <BarChart points={timing.byWeekday} valueLabel={t("analytics.panel.leadsUnit")} />
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconClock size={16} />
                  {t("analytics.panel2.byHourOfDay")}
                </h2>
                <span className={styles.panelNote}>{t("analytics.panel.serverTime")}</span>
              </div>
              <BarChart points={timing.byHour} valueLabel={t("analytics.panel.leadsUnit")} />
            </section>
          </div>

          {/* ------------------------------------------------------- contacts */}
          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconUsers size={16} />
                  {t("analytics.panel2.contactGrowth")}
                </h2>
                <span className={styles.panelNote}>{totals.contactsAllTime} contacts total</span>
              </div>
              <TimeSeriesChart
                points={data.contactsOverTime}
                valueLabel="contacts"
                emptyMessage={t("analytics.panel.noContacts")}
              />
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconInfo size={16} />
                  {t("analytics.insights.heading")}
                </h2>
              </div>
              <Insights
                data={data}
                period={t(`analytics.range.prev${range === "3y" ? "3y" : range.charAt(0).toUpperCase() + range.slice(1)}`)}
                t={t}
              />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Plain-language read of the numbers above. Everything here is a threshold on
 * data already computed — no model call, nothing that can hallucinate a trend
 * that isn't in the chart directly above it.
 */
/**
 * Renders a translated string that contains <b>…</b> emphasis.
 *
 * The alternative — splitting each sentence into three separate keys around
 * the bold part — produces fragments no translator can order correctly, and
 * Hebrew puts the emphasised number in a different position than English.
 * Keeping one key per sentence is what makes these translatable at all.
 */
function Rich({ text }) {
  return (
    <>
      {text.split(/(<b>.*?<\/b>)/g).map((part, i) =>
        part.startsWith("<b>") ? (
          <span key={i} className={styles.insightStrong}>
            {part.slice(3, -4)}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

function Insights({ data, period, t }) {
  const { totals, timing, formStats, kpis } = data;
  const items = [];

  const leadKpi = kpis.find((k) => k.key === "leads");
  if (leadKpi?.delta != null && Math.abs(leadKpi.delta) >= 10) {
    items.push({
      tone: leadKpi.delta > 0 ? "good" : "warn",
      text: t("analytics.insights.volume", {
        dir: t(leadKpi.delta > 0 ? "analytics.insights.up" : "analytics.insights.down"),
        pct: Math.abs(leadKpi.delta),
        period,
        now: totals.leadsInRange,
        prev: totals.leadsPrevRange,
      }),
    });
  }

  if (totals.backlog > 0) {
    items.push({
      tone: "warn",
      text: t("analytics.insights.backlog", {
        count: totals.backlog,
        leadWord: t(totals.backlog === 1 ? "analytics.insights.leadOne" : "analytics.insights.leadMany"),
        haveWord: t(totals.backlog === 1 ? "analytics.insights.hasOne" : "analytics.insights.haveMany"),
        duration: timing.oldestUnansweredLabel ?? "—",
      }),
    });
  }

  if (formStats.total > 0 && formStats.phoneRate < 50) {
    items.push({ tone: "warn", text: t("analytics.insights.phone", { pct: formStats.phoneRate }) });
  }

  if (formStats.messageRate >= 70) {
    items.push({
      tone: "good",
      text: t("analytics.insights.message", {
        pct: formStats.messageRate,
        chars: formStats.avgMessageLength,
      }),
    });
  }

  if (timing.busiestDay && totals.leadsInRange >= 5) {
    items.push({
      tone: "info",
      text: t("analytics.insights.busiestDay", {
        day: timing.busiestDay,
        hour: timing.busiestHourLabel ?? timing.busiestHour,
      }),
    });
  }

  if (totals.winRate != null && totals.won + totals.lost >= 5) {
    items.push({
      tone: totals.winRate >= 30 ? "good" : "info",
      text: t("analytics.insights.winRate", { pct: totals.winRate, open: totals.open }),
    });
  }

  if (!items.length) {
    items.push({ tone: "info", text: t("analytics.insights.none") });
  }

  return (
    <div className={styles.insightList}>
      {items.slice(0, 5).map((item, i) => {
        const Icon = item.tone === "warn" ? IconAlert : item.tone === "good" ? IconTrendUp : IconInfo;
        const iconClass =
          item.tone === "warn"
            ? styles.insightIconWarn
            : item.tone === "good"
              ? styles.insightIconGood
              : styles.insightIcon;
        return (
          <div className={styles.insight} key={i}>
            <Icon size={15} className={`${styles.insightIcon} ${iconClass}`} />
            <span>
              <Rich text={item.text} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

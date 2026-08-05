import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
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

export const metadata = { title: "Analytics" };

// Reporting should reflect a lead captured thirty seconds ago, so this page
// opts out of the route cache entirely rather than serving a stale snapshot.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const { range: rangeParam } = (await searchParams) ?? {};

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.tenantSlug !== tenantSlug) redirect(`/t/${session.user.tenantSlug}`);

  // Unknown values in the URL fall back rather than 404 — a hand-edited or
  // stale bookmarked ?range= shouldn't break the page.
  const range = RANGES[rangeParam] ? rangeParam : DEFAULT_RANGE;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).select("name").lean();
  const data = await getAnalytics({ tenantId: session.user.tenantId, range });

  const basePath = `/t/${tenantSlug}/analytics`;
  const { totals, timing, formStats } = data;

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={dash.pageTitle} style={{ marginBottom: 0 }}>
            Analytics
          </h1>
          <p className={styles.subtitle}>
            {RANGES[range].caption} for {tenant?.name || tenantSlug} · {totals.leadsAllTime} leads
            captured all time
          </p>
        </div>
        <RangePicker basePath={basePath} active={range} />
      </div>

      {totals.leadsAllTime === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateTitle}>No leads yet</div>
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
                  <DeltaBadge value={kpi.delta} />
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
                  Leads received
                </h2>
                <span className={styles.panelNote}>
                  {data.range.bucket === "day" ? "Daily" : "Monthly"} · dashed line is the previous{" "}
                  {RANGES[range].caption.replace("Last ", "")}
                </span>
              </div>
              <TimeSeriesChart points={data.leadsOverTime} valueLabel="leads" />
            </section>
          </div>

          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconTrendUp size={16} />
                  Cumulative leads
                </h2>
                <span className={styles.panelNote}>Running total across the period</span>
              </div>
              <TimeSeriesChart points={data.cumulative} valueLabel="leads total" />
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconTarget size={16} />
                  Outcomes
                </h2>
                <span className={styles.panelNote}>
                  {totals.winRate != null ? `${totals.winRate}% win rate` : "Nothing decided yet"}
                </span>
              </div>
              <DonutChart slices={data.outcomes} centerLabel="leads" />
              <div className={styles.panelFooter}>
                Win rate counts leads that reached a final stage. Leads still in progress are
                excluded so an early-stage backlog doesn&apos;t drag the number down.
              </div>
            </section>
          </div>

          {/* ------------------------------------------------------- pipeline */}
          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconPipeline size={16} />
                  Where leads sit
                </h2>
                <span className={styles.panelNote}>Current stage occupancy</span>
              </div>
              <FunnelBars stages={data.stageDistribution} />
              <div className={styles.panelFooter}>
                Each lead counts once, in the stage it&apos;s in today. The CRM doesn&apos;t keep a
                stage-change history, so this isn&apos;t a pass-through funnel — it&apos;s a
                snapshot of the pipeline right now.
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconTarget size={16} />
                  Win rate over time
                </h2>
                <span className={styles.panelNote}>Of leads that reached a decision</span>
              </div>
              <TimeSeriesChart
                points={data.winRateOverTime}
                valueLabel="win rate"
                unit="%"
                emptyMessage="No leads have reached a final stage yet."
              />
              <div className={styles.panelFooter}>
                Gaps are periods where no lead was won or lost — not a 0% close rate.
              </div>
            </section>
          </div>

          {/* -------------------------------------------------- responsiveness */}
          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconClock size={16} />
                  Speed to first response
                </h2>
                <span className={styles.panelNote}>Time from submission to first open</span>
              </div>
              <HBarList rows={data.responseBreakdown} mode="max" />
              <div className={styles.panelFooter}>
                Measured from when a lead arrives to the first time someone opens it in the CRM.
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconAlert size={16} />
                  Unanswered backlog
                </h2>
                <span className={styles.panelNote}>
                  {totals.backlog} waiting · all time, not just this period
                </span>
              </div>
              <HBarList
                rows={data.backlogAging}
                mode="max"
                showShare={false}
                emptyMessage="Nothing is waiting — every lead has been opened."
              />
              <div className={styles.panelFooter}>
                How long leads nobody has opened yet have been sitting there. Anything past three
                days is highlighted.
              </div>
            </section>
          </div>

          {/* ------------------------------------------------------ form stats */}
          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconForm size={16} />
                  Form submissions
                </h2>
                <span className={styles.panelNote}>What visitors actually fill in</span>
              </div>
              <div className={styles.miniStats}>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>{formStats.total}</span>
                  <span className={styles.miniStatLabel}>Forms submitted</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>{formStats.completionRate}%</span>
                  <span className={styles.miniStatLabel}>Filled every field</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>{formStats.avgFields}</span>
                  <span className={styles.miniStatLabel}>Avg. fields of 4</span>
                </div>
                <div className={styles.miniStat}>
                  <span className={styles.miniStatValue}>{formStats.avgMessageLength}</span>
                  <span className={styles.miniStatLabel}>Avg. message chars</span>
                </div>
              </div>
              <HBarList rows={data.formCompleteness} mode="share" />
              <div className={styles.panelFooter}>
                Name and email are required, so they&apos;re always 100%. Phone and message are
                optional — how often visitors bother with them is a read on both form friction and
                how serious the enquiries are.
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconInbox size={16} />
                  Lead sources
                </h2>
                <span className={styles.panelNote}>Where submissions came from</span>
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
                  When leads arrive
                </h2>
                <span className={styles.panelNote}>
                  {timing.busiestDay
                    ? `Busiest: ${timing.busiestDay}${timing.busiestHour ? ` around ${timing.busiestHour}` : ""} · ${timing.businessHoursShare}% arrive in business hours`
                    : "Not enough data yet"}
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
                  By day of week
                </h2>
              </div>
              <BarChart points={timing.byWeekday} valueLabel="leads" />
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconClock size={16} />
                  By hour of day
                </h2>
                <span className={styles.panelNote}>Server time</span>
              </div>
              <BarChart points={timing.byHour} valueLabel="leads" />
            </section>
          </div>

          {/* ------------------------------------------------------- contacts */}
          <div className={styles.panelGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconUsers size={16} />
                  Contact book growth
                </h2>
                <span className={styles.panelNote}>{totals.contactsAllTime} contacts total</span>
              </div>
              <TimeSeriesChart
                points={data.contactsOverTime}
                valueLabel="contacts"
                emptyMessage="No contacts yet."
              />
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  <IconInfo size={16} />
                  What stands out
                </h2>
              </div>
              <Insights data={data} rangeLabel={RANGES[range].caption.toLowerCase()} />
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
function Insights({ data, rangeLabel }) {
  const { totals, timing, formStats, kpis } = data;
  const items = [];

  const leadKpi = kpis.find((k) => k.key === "leads");
  if (leadKpi?.delta != null && Math.abs(leadKpi.delta) >= 10) {
    items.push({
      tone: leadKpi.delta > 0 ? "good" : "warn",
      text: (
        <>
          Lead volume is{" "}
          <span className={styles.insightStrong}>
            {leadKpi.delta > 0 ? "up" : "down"} {Math.abs(leadKpi.delta)}%
          </span>{" "}
          against the previous {rangeLabel.replace("last ", "")} ({totals.leadsInRange} vs{" "}
          {totals.leadsPrevRange}).
        </>
      ),
    });
  }

  if (totals.backlog > 0) {
    items.push({
      tone: "warn",
      text: (
        <>
          <span className={styles.insightStrong}>{totals.backlog}</span>{" "}
          {totals.backlog === 1 ? "lead has" : "leads have"} never been opened. Speed of first reply
          is the single biggest driver of close rate for inbound enquiries.
        </>
      ),
    });
  }

  if (formStats.total > 0 && formStats.phoneRate < 50) {
    items.push({
      tone: "warn",
      text: (
        <>
          Only <span className={styles.insightStrong}>{formStats.phoneRate}%</span> of submissions
          include a phone number — worth deciding whether to make the field required or drop it.
        </>
      ),
    });
  }

  if (formStats.messageRate >= 70) {
    items.push({
      tone: "good",
      text: (
        <>
          <span className={styles.insightStrong}>{formStats.messageRate}%</span> of visitors wrote a
          message, averaging {formStats.avgMessageLength} characters. Engaged enquiries, not
          drive-by form fills.
        </>
      ),
    });
  }

  if (timing.busiestDay && totals.leadsInRange >= 5) {
    items.push({
      tone: "info",
      text: (
        <>
          <span className={styles.insightStrong}>{timing.busiestDay}</span> is your strongest day
          {timing.busiestHour ? ` and ${timing.busiestHour} your busiest hour` : ""}.{" "}
          {timing.businessHoursShare < 50
            ? `${100 - timing.businessHoursShare}% of leads arrive outside business hours — an auto-reply would cover the gap.`
            : `${timing.businessHoursShare}% arrive during business hours.`}
        </>
      ),
    });
  }

  if (totals.winRate != null && totals.won + totals.lost >= 5) {
    items.push({
      tone: totals.winRate >= 30 ? "good" : "info",
      text: (
        <>
          You&apos;re closing <span className={styles.insightStrong}>{totals.winRate}%</span> of
          leads that reach a decision, with {totals.open} still in progress.
        </>
      ),
    });
  }

  if (!items.length) {
    return (
      <p className={styles.subtitle}>
        Not enough activity in this period to call out a trend yet. Try a wider range, or check back
        once more leads have come in.
      </p>
    );
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
            <span>{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}

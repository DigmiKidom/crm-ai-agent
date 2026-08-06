// Everything on the analytics screen is derived from data the CRM already
// stores — Lead, Contact and Pipeline documents. There is no visitor or event
// tracking in the product, so no metric here depends on instrumenting the
// public landing page. Where a number is necessarily an approximation (anything
// that would want a stage-change timestamp, which we don't record), the comment
// on that metric says so and the UI labels it honestly.

import Lead from "@/lib/models/Lead";
import Contact from "@/lib/models/Contact";
import Pipeline from "@/lib/models/Pipeline";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// The four windows the range picker offers. `3y` is the ceiling on purpose:
// beyond that the month buckets stop being readable and the query stops being
// cheap. Day-bucketed ranges are short; anything a year or longer buckets by
// month so the x-axis never exceeds 36 points.
export const RANGES = {
  week: { key: "week", bucket: "day", size: 7 },
  month: { key: "month", bucket: "day", size: 30 },
  year: { key: "year", bucket: "month", size: 12 },
  "3y": { key: "3y", bucket: "month", size: 36 },
};

export const RANGE_KEYS = Object.keys(RANGES);
export const DEFAULT_RANGE = "month";

/* ------------------------------------------------------------------ dates */

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// setMonth clamps oddly for end-of-month dates (Mar 31 -> Mar 3 when you go
// back a month), so every caller here works from a startOfMonth date where
// day-of-month is always 1 and the clamp can't bite.
function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function bucketKey(date, bucket) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  if (bucket === "month") return `${y}-${m}`;
  return `${y}-${m}-${String(d.getDate()).padStart(2, "0")}`;
}

function bucketLabel(date, bucket, size, locale) {
  const d = new Date(date);
  if (bucket === "month") {
    const month = d.toLocaleDateString(locale, { month: "short" });
    // Once the window spans more than one year, "Jan" alone is ambiguous.
    return size > 12 ? `${month} '${String(d.getFullYear()).slice(2)}` : month;
  }
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/**
 * Turns a range key into concrete boundaries plus the empty buckets the time
 * series will fill. Also returns the immediately-preceding window of the same
 * length, which is what every "vs. previous period" delta compares against.
 */
export function resolveRange(rangeKey, locale = "en") {
  const def = RANGES[rangeKey] || RANGES[DEFAULT_RANGE];
  const now = new Date();
  const buckets = [];

  let start;
  let prevStart;

  if (def.bucket === "day") {
    start = addDays(startOfDay(now), -(def.size - 1));
    prevStart = addDays(start, -def.size);
    for (let i = 0; i < def.size; i++) {
      const bStart = addDays(start, i);
      buckets.push({
        key: bucketKey(bStart, "day"),
        label: bucketLabel(bStart, "day", def.size, locale),
        start: bStart,
        end: addDays(bStart, 1),
      });
    }
  } else {
    start = addMonths(startOfMonth(now), -(def.size - 1));
    prevStart = addMonths(start, -def.size);
    for (let i = 0; i < def.size; i++) {
      const bStart = addMonths(start, i);
      buckets.push({
        key: bucketKey(bStart, "month"),
        label: bucketLabel(bStart, "month", def.size, locale),
        start: bStart,
        end: addMonths(bStart, 1),
      });
    }
  }

  return { ...def, now, start, end: now, prevStart, prevEnd: start, buckets };
}

/* ------------------------------------------------------------------ stages */

// Pipeline stages are AI-generated per tenant, so we can't hardcode "won" and
// "lost" — we pattern-match the tenant's own stage names, then fall back to
// position (the last stage in a pipeline is conventionally the winning one).
const WON_RE = /\b(won|win|closed[\s-]?won|customer|client|signed|sold|paid|converted|booked|deal)\b/i;
const LOST_RE = /\b(lost|closed[\s-]?lost|dead|rejected|declined|unqualified|disqualified|churned|cancell?ed|archived)\b/i;

export function classifyStages(stages) {
  const lost = stages.filter((s) => LOST_RE.test(s));
  let won = stages.filter((s) => WON_RE.test(s) && !LOST_RE.test(s));

  // No name matched, so assume the final stage is the successful outcome —
  // unless the final stage is itself a losing one.
  if (won.length === 0) {
    const last = stages[stages.length - 1];
    if (last && !LOST_RE.test(last)) won = [last];
  }

  const wonSet = new Set(won);
  const lostSet = new Set(lost);

  return {
    won: wonSet,
    lost: lostSet,
    // Everything that is neither a win nor a loss is still in play.
    isOpen: (stage) => !wonSet.has(stage) && !lostSet.has(stage),
  };
}

/* ----------------------------------------------------------------- helpers */

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

// Percent change vs. the previous window. Returns null rather than Infinity
// when the previous window was empty — "up ∞%" is not a useful thing to render,
// so the UI shows "new" instead.
function delta(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function humanDuration(ms, t) {
  if (ms == null || !Number.isFinite(ms)) return t("analytics.duration.none");
  if (ms < 60_000) return t("analytics.duration.underMinute");
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return t("analytics.duration.min", { n: mins });
  const hours = ms / HOUR_MS;
  if (hours < 24) return t("analytics.duration.hr", { n: Math.round(hours * 10) / 10 });
  const days = ms / DAY_MS;
  return t("analytics.duration.days", { n: Math.round(days * 10) / 10 });
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* ------------------------------------------------------------------- main */

/**
 * One round trip's worth of numbers for the whole analytics page.
 *
 * Leads are fetched once, projected down to the handful of fields the metrics
 * need, and everything is computed in memory. That's deliberate: nearly every
 * panel below (the heatmap, response-time distribution, field completeness)
 * needs the individual documents anyway, so a pile of separate $group pipelines
 * would mean re-scanning the same range several times over. If a tenant ever
 * gets big enough for the 3-year window to hurt, the fix is a pre-aggregated
 * daily rollup collection, not more pipelines.
 */
/**
 * `t` and `locale` are injected rather than imported: this module runs on the
 * server per request, and the labels it returns (KPI names, band names, bucket
 * dates) are display strings that belong to whoever is viewing the dashboard.
 * Baking English in here was what made the analytics screen untranslatable.
 */
export async function getAnalytics({ tenantId, range: rangeKey, t, locale = "en" }) {
  const range = resolveRange(rangeKey, locale);

  const [leads, openBacklog, pipeline, contacts, totalLeadsAllTime] = await Promise.all([
    // Reaches back to prevStart so the current and previous windows come from
    // a single query.
    Lead.find({ tenantId, createdAt: { $gte: range.prevStart } })
      .select("createdAt stage phone message source read readAt updatedAt")
      .lean(),
    // Backlog is an all-time question ("what's still sitting unanswered"), so
    // it deliberately ignores the selected range.
    Lead.find({ tenantId, read: false })
      .select("createdAt stage")
      .lean(),
    Pipeline.findOne({ tenantId }).lean(),
    Contact.find({ tenantId }).select("createdAt phone email company").lean(),
    Lead.countDocuments({ tenantId }),
  ]);

  const stages = pipeline?.stages?.length
    ? pipeline.stages
    : ["new", "contacted", "qualified", "won", "lost"];
  const { won: wonStages, lost: lostStages } = classifyStages(stages);

  const current = leads.filter((l) => new Date(l.createdAt) >= range.start);
  const previous = leads.filter((l) => {
    const ts = new Date(l.createdAt);
    return ts >= range.prevStart && ts < range.start;
  });

  /* --- 1. Leads over time, with the previous window overlaid ------------- */

  const counts = new Map(range.buckets.map((b) => [b.key, 0]));
  for (const lead of current) {
    const key = bucketKey(lead.createdAt, range.bucket);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }

  // The previous window has the same number of buckets, so it can be laid over
  // the current one index-for-index as a comparison line.
  const prevCounts = new Array(range.buckets.length).fill(0);
  for (const lead of previous) {
    const ts = new Date(lead.createdAt);
    const offset =
      range.bucket === "day"
        ? Math.floor((startOfDay(ts) - range.prevStart) / DAY_MS)
        : (ts.getFullYear() - range.prevStart.getFullYear()) * 12 +
          (ts.getMonth() - range.prevStart.getMonth());
    if (offset >= 0 && offset < prevCounts.length) prevCounts[offset] += 1;
  }

  const leadsOverTime = range.buckets.map((b, i) => ({
    label: b.label,
    value: counts.get(b.key) ?? 0,
    compare: prevCounts[i],
  }));

  // Running total across the window — the "are we growing" view, which a bar
  // chart of per-day counts hides when daily volume is low.
  let running = 0;
  const cumulative = leadsOverTime.map((p) => {
    running += p.value;
    return { label: p.label, value: running };
  });

  /* --- 2. Outcomes and win rate ----------------------------------------- */

  const wonCount = current.filter((l) => wonStages.has(l.stage)).length;
  const lostCount = current.filter((l) => lostStages.has(l.stage)).length;
  const openCount = current.length - wonCount - lostCount;
  const decided = wonCount + lostCount;

  const prevWon = previous.filter((l) => wonStages.has(l.stage)).length;
  const prevLost = previous.filter((l) => lostStages.has(l.stage)).length;
  const prevDecided = prevWon + prevLost;

  // Win rate per bucket, so the tenant can see whether close rate is improving
  // and not just whether volume is. Buckets with no decided leads are null
  // (a gap in the line) rather than 0 — a month with nothing decided is not a
  // month with a 0% win rate.
  const winRateOverTime = range.buckets.map((b) => {
    const inBucket = current.filter((l) => {
      const ts = new Date(l.createdAt);
      return ts >= b.start && ts < b.end;
    });
    const w = inBucket.filter((l) => wonStages.has(l.stage)).length;
    const d = w + inBucket.filter((l) => lostStages.has(l.stage)).length;
    return { label: b.label, value: d ? percent(w, d) : null, meta: `${w}/${d} decided` };
  });

  /* --- 3. Pipeline distribution ----------------------------------------- */

  // Current occupancy, not a true funnel: a lead sits in exactly one stage and
  // we don't store stage-change history, so we can't say how many leads *passed
  // through* a stage. The UI labels this "where leads sit right now".
  const stageDistribution = stages.map((stage) => {
    const count = current.filter((l) => l.stage === stage).length;
    return {
      label: stage,
      value: count,
      share: percent(count, current.length),
      kind: wonStages.has(stage) ? "won" : lostStages.has(stage) ? "lost" : "open",
    };
  });

  /* --- 4. Response time -------------------------------------------------- */

  // readAt is stamped the first time someone opens the lead, which is the best
  // proxy we have for "a human looked at this". Only leads that have actually
  // been opened contribute to the average.
  const responded = current.filter((l) => l.readAt && l.createdAt);
  const responseTimes = responded.map((l) => new Date(l.readAt) - new Date(l.createdAt));
  const avgResponse = responseTimes.length
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : null;

  const prevResponded = previous.filter((l) => l.readAt && l.createdAt);
  const prevResponseTimes = prevResponded.map((l) => new Date(l.readAt) - new Date(l.createdAt));
  const prevAvgResponse = prevResponseTimes.length
    ? prevResponseTimes.reduce((a, b) => a + b, 0) / prevResponseTimes.length
    : null;

  const RESPONSE_BANDS = [
    { label: t("analytics.band.under1h"), max: HOUR_MS },
    { label: t("analytics.band.1to4h"), max: 4 * HOUR_MS },
    { label: t("analytics.band.4to24h"), max: DAY_MS },
    { label: t("analytics.band.1to3d"), max: 3 * DAY_MS },
    { label: t("analytics.band.over3d"), max: Infinity },
  ];
  const responseBreakdown = RESPONSE_BANDS.map((band, i) => {
    const min = i === 0 ? 0 : RESPONSE_BANDS[i - 1].max;
    const count = responseTimes.filter((ms) => ms >= min && ms < band.max).length;
    return { label: band.label, value: count, share: percent(count, current.length) };
  });
  const neverOpened = current.length - responded.length;
  if (neverOpened > 0) {
    responseBreakdown.push({
      label: t("analytics.band.notOpened"),
      value: neverOpened,
      share: percent(neverOpened, current.length),
      muted: true,
    });
  }

  /* --- 5. Form completeness --------------------------------------------- */

  // The lead form asks for four things; name and email are required, phone and
  // message are not. How often visitors bother with the optional fields is a
  // real signal about form friction and lead quality — and it's the closest
  // thing to "form fill" data we can get without instrumenting the page.
  const withPhone = current.filter((l) => l.phone?.trim()).length;
  const withMessage = current.filter((l) => l.message?.trim()).length;
  const fullyCompleted = current.filter((l) => l.phone?.trim() && l.message?.trim()).length;
  const totalFieldsFilled = current.reduce(
    (sum, l) => sum + 2 + (l.phone?.trim() ? 1 : 0) + (l.message?.trim() ? 1 : 0),
    0
  );

  const formCompleteness = [
    { label: t("analytics.field.name"), value: current.length, share: 100, required: true },
    { label: t("analytics.field.email"), value: current.length, share: 100, required: true },
    { label: t("analytics.field.phone"), value: withPhone, share: percent(withPhone, current.length) },
    { label: t("analytics.field.message"), value: withMessage, share: percent(withMessage, current.length) },
  ];

  const messageLengths = current
    .filter((l) => l.message?.trim())
    .map((l) => l.message.trim().length);

  /* --- 6. When leads arrive --------------------------------------------- */

  // 7x24 grid. Over a short window this is sparse, but over a year it's the
  // panel that tells a tenant when to actually staff their inbox.
  const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const byWeekday = new Array(7).fill(0);
  const byHour = new Array(24).fill(0);
  for (const lead of current) {
    const ts = new Date(lead.createdAt);
    heatmap[ts.getDay()][ts.getHours()] += 1;
    byWeekday[ts.getDay()] += 1;
    byHour[ts.getHours()] += 1;
  }

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const busiestDayIndex = byWeekday.indexOf(Math.max(...byWeekday));
  const busiestHourIndex = byHour.indexOf(Math.max(...byHour));
  const businessHours = current.filter((l) => {
    const ts = new Date(l.createdAt);
    const day = ts.getDay();
    const hour = ts.getHours();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
  }).length;

  /* --- 7. Sources -------------------------------------------------------- */

  const sourceMap = new Map();
  for (const lead of current) {
    const src = (lead.source || "unknown").trim() || "unknown";
    sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
  }
  const sources = [...sourceMap.entries()]
    .map(([label, value]) => ({ label, value, share: percent(value, current.length) }))
    .sort((a, b) => b.value - a.value);

  /* --- 8. Backlog aging -------------------------------------------------- */

  const AGE_BANDS = [
    { label: t("analytics.aging.today"), max: DAY_MS },
    { label: t("analytics.aging.1to3d"), max: 3 * DAY_MS },
    { label: t("analytics.aging.3to7d"), max: 7 * DAY_MS },
    { label: t("analytics.aging.overWeek"), max: Infinity },
  ];
  const nowMs = Date.now();
  const backlogAging = AGE_BANDS.map((band, i) => {
    const min = i === 0 ? 0 : AGE_BANDS[i - 1].max;
    const count = openBacklog.filter((l) => {
      const age = nowMs - new Date(l.createdAt);
      return age >= min && age < band.max;
    }).length;
    return { label: band.label, value: count, urgent: i >= 2 };
  });
  const oldestUnanswered = openBacklog.length
    ? Math.max(...openBacklog.map((l) => nowMs - new Date(l.createdAt)))
    : null;

  /* --- 9. Contacts ------------------------------------------------------- */

  const contactsInRange = contacts.filter((c) => new Date(c.createdAt) >= range.start);
  const prevContacts = contacts.filter((c) => {
    const ts = new Date(c.createdAt);
    return ts >= range.prevStart && ts < range.start;
  });

  const contactCounts = new Map(range.buckets.map((b) => [b.key, 0]));
  for (const c of contactsInRange) {
    const key = bucketKey(c.createdAt, range.bucket);
    if (contactCounts.has(key)) contactCounts.set(key, contactCounts.get(key) + 1);
  }
  let runningContacts = contacts.filter((c) => new Date(c.createdAt) < range.start).length;
  const contactsOverTime = range.buckets.map((b) => {
    runningContacts += contactCounts.get(b.key) ?? 0;
    return { label: b.label, value: runningContacts };
  });

  /* --- 10. Headline KPIs ------------------------------------------------- */

  const kpis = [
    {
      key: "leads",
      label: t("analytics.kpi.leads"),
      value: current.length,
      delta: delta(current.length, previous.length),
      previous: previous.length,
      hint: t("analytics.kpi.prevPeriod", { count: previous.length }),
      spark: leadsOverTime.map((p) => p.value),
    },
    {
      key: "winRate",
      label: t("analytics.kpi.winRate"),
      value: decided ? `${percent(wonCount, decided)}%` : "—",
      delta: decided && prevDecided ? delta(percent(wonCount, decided), percent(prevWon, prevDecided)) : null,
      hint: decided
        ? t("analytics.kpi.wonOfDecided", { won: wonCount, decided })
        : t("analytics.kpi.noDecided"),
      spark: winRateOverTime.map((p) => p.value ?? 0),
    },
    {
      key: "response",
      label: t("analytics.kpi.response"),
      value: humanDuration(avgResponse, t),
      // Faster is better here, so the sign is flipped before it reaches the UI.
      delta: avgResponse != null && prevAvgResponse != null ? -delta(avgResponse, prevAvgResponse) : null,
      hint:
        responseTimes.length > 0
          ? t("analytics.kpi.medianOpened", {
              median: humanDuration(median(responseTimes), t),
              responded: responded.length,
              total: current.length,
            })
          : t("analytics.kpi.noneOpened"),
    },
    {
      key: "backlog",
      label: t("analytics.kpi.backlog"),
      value: openBacklog.length,
      tone: openBacklog.length > 0 ? "warn" : "ok",
      hint: oldestUnanswered
        ? t("analytics.kpi.oldestWaiting", { duration: humanDuration(oldestUnanswered, t) })
        : t("analytics.kpi.allOpened"),
    },
    {
      key: "completeness",
      label: t("analytics.kpi.completeness"),
      value: current.length ? `${Math.round((totalFieldsFilled / current.length) * 100) / 100} / 4` : "—",
      hint: t("analytics.kpi.filledEvery", { percent: percent(fullyCompleted, current.length) }),
    },
    {
      key: "contacts",
      label: t("analytics.kpi.contacts"),
      value: contactsInRange.length,
      delta: delta(contactsInRange.length, prevContacts.length),
      hint: t("analytics.kpi.totalContacts", { count: contacts.length }),
    },
  ];

  return {
    range: {
      key: range.key,
      bucket: range.bucket,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      prevStart: range.prevStart.toISOString(),
    },
    kpis,
    totals: {
      leadsAllTime: totalLeadsAllTime,
      leadsInRange: current.length,
      leadsPrevRange: previous.length,
      contactsAllTime: contacts.length,
      won: wonCount,
      lost: lostCount,
      open: openCount,
      winRate: decided ? percent(wonCount, decided) : null,
      backlog: openBacklog.length,
    },
    leadsOverTime,
    cumulative,
    winRateOverTime,
    stageDistribution,
    outcomes: [
      { label: "Won", value: wonCount, kind: "won" },
      { label: "In progress", value: openCount, kind: "open" },
      { label: "Lost", value: lostCount, kind: "lost" },
    ],
    responseBreakdown,
    formCompleteness,
    formStats: {
      total: current.length,
      withPhone,
      withMessage,
      fullyCompleted,
      phoneRate: percent(withPhone, current.length),
      messageRate: percent(withMessage, current.length),
      completionRate: percent(fullyCompleted, current.length),
      avgFields: current.length ? Math.round((totalFieldsFilled / current.length) * 100) / 100 : 0,
      avgMessageLength: messageLengths.length
        ? Math.round(messageLengths.reduce((a, b) => a + b, 0) / messageLengths.length)
        : 0,
      longestMessage: messageLengths.length ? Math.max(...messageLengths) : 0,
    },
    heatmap,
    timing: {
      byWeekday: WEEKDAYS.map((label, i) => ({ label, value: byWeekday[i] })),
      byHour: byHour.map((value, hour) => ({
        label: `${String(hour).padStart(2, "0")}:00`,
        value,
      })),
      busiestDay: byWeekday[busiestDayIndex] ? WEEKDAYS[busiestDayIndex] : null,
      busiestHour: byHour[busiestHourIndex]
        ? `${String(busiestHourIndex).padStart(2, "0")}:00`
        : null,
      businessHoursShare: percent(businessHours, current.length),
    },
    sources,
    backlogAging,
    contactsOverTime,
  };
}

export { humanDuration, percent };

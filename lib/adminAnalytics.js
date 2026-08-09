import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import PageReport from "@/lib/models/PageReport";

// Platform-wide metrics for the admin dashboard.
//
// Cross-tenant by definition, which is why none of this goes through
// lib/tenantScope.js — that helper exists to make a missing tenant filter
// impossible, and every query here deliberately has none. Keeping those
// queries in this one file (imported only by admin routes, which are behind
// requireSuperAdmin) is what keeps that exception auditable: if a query
// without a tenant filter appears anywhere else, it's a bug.
//
// Server-only.

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Daily counts for the last `days` days, as [{ label, value }] ready for
 * TimeSeriesChart — including the days where nothing happened, which a plain
 * group-by would silently omit and which are exactly the days worth seeing.
 */
async function dailySeries(Model, days, locale, extraMatch = {}) {
  const since = startOfDay(new Date(Date.now() - (days - 1) * DAY_MS));

  const rows = await Model.aggregate([
    { $match: { createdAt: { $gte: since }, ...extraMatch } },
    {
      $group: {
        // Grouped in UTC. The alternative — a fixed server timezone — is
        // wrong for somebody either way on a platform with tenants in
        // several countries, and UTC is at least consistently wrong.
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
  ]);

  const byDay = new Map(rows.map((r) => [r._id, r.count]));
  const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(since.getTime() + i * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    return { label: formatter.format(date), value: byDay.get(key) || 0 };
  });
}

/**
 * Everything the admin overview renders, in one round trip.
 *
 * `days` controls the chart window only — the headline totals are all-time,
 * because "how big is the platform" and "what happened this week" are
 * different questions and mixing them makes both unreadable.
 */
export async function getPlatformStats({ days = 30, locale = "en" } = {}) {
  await connectDB();

  const since7 = new Date(Date.now() - 7 * DAY_MS);
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const [
    totalUsers,
    totalTenants,
    livePages,
    blockedPages,
    totalLeads,
    leads7,
    signups7,
    signups30,
    activeTenants30,
    openReports,
    suspendedUsers,
    signupSeries,
    leadSeries,
  ] = await Promise.all([
    User.countDocuments({}),
    Tenant.countDocuments({}),
    // "Active landing page" = a tenant whose page isn't blocked. Every tenant
    // has a page from the moment they sign up, so this is a count of what a
    // visitor could actually reach right now.
    Tenant.countDocuments({ "moderation.pageBlocked": { $ne: true } }),
    Tenant.countDocuments({ "moderation.pageBlocked": true }),
    Lead.countDocuments({}),
    Lead.countDocuments({ createdAt: { $gte: since7 } }),
    User.countDocuments({ createdAt: { $gte: since7 } }),
    User.countDocuments({ createdAt: { $gte: since30 } }),
    // Activity measured by leads captured, not by logins — we don't track
    // sessions, and a tenant whose page is collecting leads is the definition
    // of one getting value from the product.
    Lead.distinct("tenantId", { createdAt: { $gte: since30 } }).then((ids) => ids.length),
    PageReport.countDocuments({ status: "open" }),
    User.countDocuments({ suspendedAt: { $ne: null } }),
    dailySeries(User, days, locale),
    dailySeries(Lead, days, locale),
  ]);

  return {
    totals: {
      users: totalUsers,
      tenants: totalTenants,
      livePages,
      blockedPages,
      leads: totalLeads,
      leads7,
      signups7,
      signups30,
      activeTenants30,
      openReports,
      suspendedUsers,
    },
    signupSeries,
    leadSeries,
  };
}

/**
 * One page of the user-management table.
 *
 * Searches people and businesses together — an admin chasing a report has a
 * slug or a domain, an admin chasing a support email has an address, and
 * making them pick the right box first is friction for no benefit.
 */
export async function listTenants({ query = "", status = "all", page = 1, perPage = 25 } = {}) {
  await connectDB();

  const filter = {};
  if (status === "blocked") filter["moderation.pageBlocked"] = true;
  else if (status === "reported") filter["moderation.openReportCount"] = { $gt: 0 };

  const term = query.trim();
  if (term) {
    // Escaped: an admin pasting a slug containing regex metacharacters should
    // search for it, not build a pattern out of it.
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");

    // Two collections, one search box: find matching users first, then union
    // their tenants with the tenants matching directly.
    const userTenantIds = await User.find({ $or: [{ email: rx }, { name: rx }] })
      .select("tenantId")
      .limit(200)
      .lean();

    filter.$or = [
      { name: rx },
      { slug: rx },
      { "customDomain.hostname": rx },
      { _id: { $in: userTenantIds.map((u) => u.tenantId) } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * perPage;

  const [tenants, total] = await Promise.all([
    Tenant.find(filter)
      .select("name slug createdAt plan moderation customDomain.hostname")
      // Most-reported first, then newest: the rows an admin opened this page
      // for are at the top without them having to sort.
      .sort({ "moderation.openReportCount": -1, createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    Tenant.countDocuments(filter),
  ]);

  const tenantIds = tenants.map((t) => t._id);

  // Owners and lead counts for just this page of rows — an aggregation per
  // tenant would be a query per row.
  const [owners, leadCounts] = await Promise.all([
    User.find({ tenantId: { $in: tenantIds } })
      .select("tenantId email name role suspendedAt createdAt")
      .lean(),
    Lead.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      { $group: { _id: "$tenantId", count: { $sum: 1 } } },
    ]),
  ]);

  const leadsByTenant = new Map(leadCounts.map((r) => [String(r._id), r.count]));
  const membersByTenant = new Map();
  for (const user of owners) {
    const key = String(user.tenantId);
    if (!membersByTenant.has(key)) membersByTenant.set(key, []);
    membersByTenant.get(key).push(user);
  }

  return {
    total,
    page: Math.max(1, page),
    perPage,
    rows: tenants.map((tenant) => {
      const members = membersByTenant.get(String(tenant._id)) || [];
      const owner = members.find((m) => m.role === "owner") || members[0] || null;
      return {
        id: String(tenant._id),
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        customDomain: tenant.customDomain?.hostname || "",
        createdAt: tenant.createdAt,
        leads: leadsByTenant.get(String(tenant._id)) || 0,
        memberCount: members.length,
        owner: owner
          ? {
              id: String(owner._id),
              email: owner.email,
              name: owner.name || "",
              suspended: Boolean(owner.suspendedAt),
            }
          : null,
        pageBlocked: Boolean(tenant.moderation?.pageBlocked),
        openReports: tenant.moderation?.openReportCount || 0,
      };
    }),
  };
}

/**
 * Everything about one tenant, for the admin's detail view: the business, its
 * people, its CRM activity, and its report history.
 *
 * Note what this deliberately does NOT return: lead names, emails, phone
 * numbers, or message bodies. An admin needs to know a tenant is capturing
 * leads and whether their page is abusive — not who their customers are.
 * Reading another business's customer list is not a moderation power.
 */
export async function getTenantDetail(tenantId) {
  await connectDB();

  const tenant = await Tenant.findById(tenantId).lean();
  if (!tenant) return null;

  const [members, leadCount, recentLeadCount, lastLead, reports] = await Promise.all([
    User.find({ tenantId })
      .select("email name role suspendedAt suspendedReason createdAt emailVerified")
      .sort({ createdAt: 1 })
      .lean(),
    Lead.countDocuments({ tenantId }),
    Lead.countDocuments({ tenantId, createdAt: { $gte: new Date(Date.now() - 30 * DAY_MS) } }),
    Lead.findOne({ tenantId }).sort({ createdAt: -1 }).select("createdAt").lean(),
    PageReport.find({ tenantId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return {
    tenant: {
      id: String(tenant._id),
      name: tenant.name,
      slug: tenant.slug,
      industry: tenant.industry || "",
      plan: tenant.plan,
      createdAt: tenant.createdAt,
      customDomain: tenant.customDomain?.hostname || "",
      headline: tenant.landingPage?.headline || "",
      subheadline: tenant.landingPage?.subheadline || "",
      templateId: tenant.templateId,
      moderation: {
        pageBlocked: Boolean(tenant.moderation?.pageBlocked),
        blockedAt: tenant.moderation?.blockedAt || null,
        blockedReason: tenant.moderation?.blockedReason || "",
        openReportCount: tenant.moderation?.openReportCount || 0,
      },
    },
    members: members.map((m) => ({
      id: String(m._id),
      email: m.email,
      name: m.name || "",
      role: m.role,
      suspended: Boolean(m.suspendedAt),
      suspendedReason: m.suspendedReason || "",
      emailVerified: Boolean(m.emailVerified),
      createdAt: m.createdAt,
    })),
    crm: {
      totalLeads: leadCount,
      leads30: recentLeadCount,
      lastLeadAt: lastLead?.createdAt || null,
    },
    reports: reports.map((r) => ({
      id: String(r._id),
      reason: r.reason,
      notes: r.notes,
      status: r.status,
      createdAt: r.createdAt,
      reporterIp: r.reporterIp,
      reporterEmail: r.reporterEmail,
    })),
  };
}

/** The moderation queue itself. */
export async function listReports({ status = "open", page = 1, perPage = 25 } = {}) {
  await connectDB();

  const filter = status === "all" ? {} : { status };
  const skip = (Math.max(1, page) - 1) * perPage;

  const [reports, total] = await Promise.all([
    PageReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    PageReport.countDocuments(filter),
  ]);

  const tenantIds = [...new Set(reports.map((r) => String(r.tenantId)))];
  const tenants = await Tenant.find({ _id: { $in: tenantIds } })
    .select("name slug moderation.pageBlocked")
    .lean();
  const byId = new Map(tenants.map((t) => [String(t._id), t]));

  return {
    total,
    page: Math.max(1, page),
    perPage,
    rows: reports.map((r) => {
      const tenant = byId.get(String(r.tenantId));
      return {
        id: String(r.id || r._id),
        tenantId: String(r.tenantId),
        tenantName: tenant?.name || r.tenantSlug,
        tenantSlug: tenant?.slug || r.tenantSlug,
        pageBlocked: Boolean(tenant?.moderation?.pageBlocked),
        reason: r.reason,
        notes: r.notes,
        reporterEmail: r.reporterEmail,
        reporterIp: r.reporterIp,
        status: r.status,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        resolutionNote: r.resolutionNote,
      };
    }),
  };
}

import Lead from "@/lib/models/Lead";
import { tenantScoped } from "@/lib/tenantScope";

// The closed-deals log: what was won, what was lost, and what it was worth.
//
// Distinct from lib/analytics.js on purpose. Analytics answers "how is the
// business trending" and buckets everything by lead capture date; this
// answers "what closed, and when" and orders by closing date, which is the
// question an accountant asks. Sharing one module would mean one of the two
// silently using the wrong date.
//
// Server-only.

/**
 * Every decided deal for one tenant, plus the headline numbers.
 *
 * `closedAt` falls back through closure.closedAt → wonAt → updatedAt: deals
 * closed before the resolution modal shipped still have a defensible date,
 * and a log that silently omitted them would be worse than one with an
 * approximate date on old rows.
 */
export async function getClosedDeals(tenantId, { from = null, to = null, outcome = "all" } = {}) {
  const filter = { dealStatus: { $in: ["won", "lost"] } };
  if (outcome === "won" || outcome === "lost") filter.dealStatus = outcome;

  const leads = await tenantScoped(Lead, tenantId)
    .find(filter)
    .select("name email phone stage dealStatus dealValue wonAt closure createdAt updatedAt")
    .lean();

  const rows = leads
    .map((lead) => {
      const closedAt = lead.closure?.closedAt || lead.wonAt || lead.updatedAt;
      return {
        id: String(lead._id),
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        stage: lead.stage,
        outcome: lead.dealStatus,
        // The closing snapshot where one exists, the live figure otherwise.
        // A lost deal is always zero regardless of what it was once valued
        // at — an unrealised figure is not revenue.
        amount: lead.dealStatus === "won" ? lead.closure?.amount || lead.dealValue || 0 : 0,
        services: lead.closure?.services || "",
        resolutionNotes: lead.closure?.resolutionNotes || "",
        closedAt,
        createdAt: lead.createdAt,
        // How long the deal took, in days — the one derived figure worth
        // having here, and impossible to compute in a spreadsheet after
        // export without both dates.
        daysToClose:
          closedAt && lead.createdAt
            ? Math.max(0, Math.round((new Date(closedAt) - new Date(lead.createdAt)) / 86400000))
            : null,
        // Present only so the UI can flag rows that predate the resolution
        // modal and therefore have no summary to show.
        hasSummary: Boolean(lead.closure?.closedAt),
      };
    })
    .filter((row) => {
      if (from && new Date(row.closedAt) < new Date(from)) return false;
      if (to && new Date(row.closedAt) > new Date(`${to}T23:59:59.999Z`)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

  const won = rows.filter((r) => r.outcome === "won");
  const lost = rows.filter((r) => r.outcome === "lost");
  const revenue = won.reduce((sum, r) => sum + r.amount, 0);
  // Averaged over deals that actually carry a figure. Including unvalued
  // wins would drag the average toward zero and make it read as a discount
  // rather than a gap in the data.
  const valuedWon = won.filter((r) => r.amount > 0);

  return {
    rows,
    totals: {
      won: won.length,
      lost: lost.length,
      decided: rows.length,
      revenue,
      avgDealSize: valuedWon.length ? Math.round(revenue / valuedWon.length) : null,
      valuedWon: valuedWon.length,
      winRate: rows.length ? Math.round((won.length / rows.length) * 100) : null,
      avgDaysToClose: won.length
        ? Math.round(
            won.reduce((sum, r) => sum + (r.daysToClose ?? 0), 0) / won.length
          )
        : null,
    },
  };
}

/**
 * RFC 4180 CSV. Quotes every field rather than only the ones that need it —
 * a name containing a comma is common, and conditional quoting is where CSV
 * writers go wrong.
 *
 * The BOM is not decoration: without it Excel on Windows reads a UTF-8 file
 * as Latin-1, and every Hebrew name in the export becomes mojibake.
 */
export function closedDealsCsv(rows, headers) {
  const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const date = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

  const lines = [
    [
      headers.name,
      headers.outcome,
      headers.amount,
      headers.services,
      headers.notes,
      headers.closedAt,
      headers.capturedAt,
      headers.daysToClose,
      headers.email,
      headers.phone,
      headers.stage,
    ].map(cell).join(","),
  ];

  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.outcome === "won" ? headers.won : headers.lost,
        // Unformatted: a spreadsheet wants a number it can sum, not "$1,200".
        row.amount,
        row.services,
        row.resolutionNotes,
        date(row.closedAt),
        date(row.createdAt),
        row.daysToClose ?? "",
        row.email,
        row.phone,
        row.stage,
      ]
        .map(cell)
        .join(",")
    );
  }

  return `﻿${lines.join("\r\n")}\r\n`;
}

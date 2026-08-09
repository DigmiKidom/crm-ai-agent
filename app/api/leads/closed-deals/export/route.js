import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireTenantSession } from "@/lib/tenantSession";
import { getClosedDeals, closedDealsCsv } from "@/lib/closedDeals";

/**
 * Closed deals as a CSV, for accounting or a spreadsheet.
 *
 * Streams whatever the log currently shows, honouring the same date and
 * outcome filters as the page — so what someone exports is what they were
 * looking at, not a differently-scoped file they then have to reconcile.
 */
export async function GET(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;
  const outcome = searchParams.get("outcome") || "all";

  try {
    await connectDB();

    const { rows } = await getClosedDeals(tenantId, { from, to, outcome });

    const csv = closedDealsCsv(rows, {
      name: t("closedDeals.csv.name"),
      outcome: t("closedDeals.csv.outcome"),
      amount: t("closedDeals.csv.amount"),
      services: t("closedDeals.csv.services"),
      notes: t("closedDeals.csv.notes"),
      closedAt: t("closedDeals.csv.closedAt"),
      capturedAt: t("closedDeals.csv.capturedAt"),
      daysToClose: t("closedDeals.csv.daysToClose"),
      email: t("closedDeals.csv.email"),
      phone: t("closedDeals.csv.phone"),
      stage: t("closedDeals.csv.stage"),
      won: t("leads.dealStatus.won"),
      lost: t("leads.dealStatus.lost"),
    });

    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="closed-deals-${stamp}.csv"`,
        // Customer names and revenue: never cached by an intermediary.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("Exporting closed deals failed:", err);
    return NextResponse.json({ error: t("api.leads.loadFailed") }, { status: 503 });
  }
}

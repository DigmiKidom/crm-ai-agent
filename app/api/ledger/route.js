import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LedgerEntry, {
  LEDGER_TYPES,
  MAX_LEDGER_AMOUNT,
  MAX_LEDGER_DESCRIPTION,
} from "@/lib/models/LedgerEntry";
import { dateOnly, num, str } from "@/lib/apiInput";
import { monthRange, monthlySummaries, summarize } from "@/lib/ledger";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

// A year of daily entries for a small business sits well inside this; the cap
// exists so one tenant's decade of history can't become an unbounded read.
const PAGE_SIZE = 500;

export async function GET(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  // ?month=YYYY-MM narrows to one month. Absent means "everything recent",
  // which is what the page loads first — the month filter is a refinement, not
  // a required parameter, so a bookmarked URL without it still works.
  const month = str(new URL(request.url).searchParams.get("month"), 7);
  const range = month ? monthRange(month) : null;
  if (month && !range) {
    return NextResponse.json({ error: t("api.ledger.invalidMonth") }, { status: 400 });
  }

  try {
    await connectDB();
    const filter = range ? { date: { $gte: range.start, $lt: range.end } } : {};
    const entries = await tenantScoped(LedgerEntry, tenantId)
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(PAGE_SIZE)
      .select("date description type amount createdAt")
      .lean();

    // Both shapes come back in one response: the totals for whatever is on
    // screen, and the per-month breakdown that drives the summary strip. The
    // alternative is a second round trip that can disagree with the first.
    return NextResponse.json({
      ok: true,
      entries,
      summary: summarize(entries),
      months: monthlySummaries(entries),
    });
  } catch (err) {
    console.error("Listing ledger entries failed:", err);
    return NextResponse.json({ error: t("api.ledger.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId, session } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};

  if (!LEDGER_TYPES.includes(body.type)) {
    return NextResponse.json({ error: t("api.ledger.invalidType") }, { status: 400 });
  }

  // Rejected rather than coerced to 0: a row reading "₪0" that the user typed
  // "12,50" into is worse than an error, because it silently enters the totals.
  const amount = num(body.amount, { min: 0, max: MAX_LEDGER_AMOUNT });
  if (amount === null) {
    return NextResponse.json({ error: t("api.ledger.invalidAmount") }, { status: 400 });
  }

  const date = dateOnly(body.date) ?? dateOnly(new Date());

  try {
    await connectDB();
    const entry = await tenantScoped(LedgerEntry, tenantId).create({
      date,
      description: str(body.description, MAX_LEDGER_DESCRIPTION),
      type: body.type,
      amount,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      ok: true,
      entry: {
        _id: entry._id.toString(),
        date: entry.date,
        description: entry.description,
        type: entry.type,
        amount: entry.amount,
        createdAt: entry.createdAt,
      },
    });
  } catch (err) {
    console.error("Creating a ledger entry failed:", err);
    return NextResponse.json({ error: t("api.ledger.saveFailed") }, { status: 503 });
  }
}

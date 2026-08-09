import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import { staleBefore, normalizeInterval } from "@/lib/followUp";

/**
 * Flags leads that have gone quiet. Runs on a schedule — see vercel.json.
 *
 * Cost per run: one query for the tenants that have reminders on, then one
 * bulk update per distinct interval (three at most, since there are only
 * three non-"never" options). Not one query per tenant, and emphatically not
 * one per lead — this has to stay cheap as the platform grows, or it becomes
 * the thing that wakes someone up.
 *
 * Idempotent: re-running it changes nothing that isn't already true, so a
 * double-fire from the scheduler is harmless and a missed run self-corrects
 * on the next one.
 */

// Authorization for a request with no user behind it. Vercel Cron sends this
// header automatically; anything else must present the same secret. Without
// CRON_SECRET set the route refuses to run at all rather than defaulting to
// open — an unauthenticated endpoint that writes to every tenant's leads is
// not something to leave enabled by accident in development.
function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    // 404, not 401: there's nothing here to probe.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await connectDB();

    const tenants = await Tenant.find({
      "outreach.followUpInterval": { $ne: "never" },
    })
      .select("outreach.followUpInterval")
      .lean();

    if (tenants.length === 0) {
      return NextResponse.json({ ok: true, tenantsChecked: 0, flagged: 0 });
    }

    // Group tenants by interval so each distinct setting is a single bulk
    // update covering every tenant that shares it.
    const byInterval = new Map();
    for (const tenant of tenants) {
      const interval = normalizeInterval(tenant.outreach?.followUpInterval);
      if (!byInterval.has(interval)) byInterval.set(interval, []);
      byInterval.get(interval).push(tenant._id);
    }

    const now = Date.now();
    let flagged = 0;

    for (const [interval, tenantIds] of byInterval) {
      const cutoff = staleBefore(interval, now);
      if (!cutoff) continue;

      const result = await Lead.updateMany(
        {
          tenantId: { $in: tenantIds },
          // Open deals only — a won or lost lead is finished business.
          dealStatus: "open",
          needsFollowUp: { $ne: true },
          // Mirrors shouldFlag()'s fallback: a lead captured before
          // lastActivityAt existed is judged on when it arrived.
          $or: [
            { lastActivityAt: { $lte: cutoff } },
            { lastActivityAt: null, createdAt: { $lte: cutoff } },
            { lastActivityAt: { $exists: false }, createdAt: { $lte: cutoff } },
          ],
        },
        { $set: { needsFollowUp: true, followUpFlaggedAt: new Date() } }
      );

      flagged += result.modifiedCount || 0;
    }

    // Housekeeping: clear the flag from anything that closed while flagged.
    // Cheaper than making every close path remember to unflag, and it means
    // a lead can never sit in "chase this" and "already won" at once.
    const cleared = await Lead.updateMany(
      { needsFollowUp: true, dealStatus: { $ne: "open" } },
      { $set: { needsFollowUp: false, followUpFlaggedAt: null } }
    );

    return NextResponse.json({
      ok: true,
      tenantsChecked: tenants.length,
      flagged,
      cleared: cleared.modifiedCount || 0,
    });
  } catch (err) {
    console.error("Follow-up flagging job failed:", err);
    return NextResponse.json({ error: "Job failed" }, { status: 503 });
  }
}

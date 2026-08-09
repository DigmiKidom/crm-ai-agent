import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import VisitorSeen from "@/lib/models/VisitorSeen";
import VisitRollup from "@/lib/models/VisitRollup";
import { isLikelyBot, dailyVisitorHash, dateKeyFor } from "@/lib/tracking";

const ROLLUP_FIELD = { visit: "visits", cta_click: "ctaClicks" };

// Vercel (and any standard reverse proxy) sets this; mirrors the same
// helper in proxy.js.
function clientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// Public, fire-and-forget beacon for both events the landing page tracks:
// a page view (see components/templates/shared/VisitBeacon.js) and a CTA
// click (see components/templates/shared/CtaLink.js) — same dedup mechanism
// for both (one count per visitor per day per kind), so this one endpoint
// and one hashing scheme covers both instead of duplicating either. The
// public page itself is ISR-cached and identical for every visitor, so
// there is no per-request server hook to count either from directly; this
// is the client-side substitute. Always resolves cleanly regardless of
// outcome — a tracking beacon failing must never be visible to the visitor
// or throw in their console.
export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const tenantSlug = body?.tenantSlug;
    const kind = body?.type === "cta_click" ? "cta_click" : "visit";
    if (!tenantSlug) return new NextResponse(null, { status: 204 });

    const userAgent = request.headers.get("user-agent") || "";
    if (isLikelyBot(userAgent)) return new NextResponse(null, { status: 204 });

    await connectDB();
    const tenant = await Tenant.findOne({ slug: tenantSlug }).select("_id").lean();
    if (!tenant) return new NextResponse(null, { status: 204 });

    const dateKey = dateKeyFor();
    // Same hash whether this is a visit or a click — kind is what
    // distinguishes the two dedup ledger entries, not the hash itself, so a
    // returning-today visitor who both viewed and clicked contributes
    // exactly one row to each ledger.
    const visitorHash = dailyVisitorHash({
      ip: clientIp(request),
      userAgent,
      tenantId: tenant._id.toString(),
      dateKey,
    });

    try {
      // Succeeds only for this visitor's FIRST beacon of this kind for this
      // tenant today — the unique index on {tenantId, date, visitorHash,
      // kind} rejects every repeat as a duplicate key, which is the dedup
      // mechanism itself.
      await VisitorSeen.create({ tenantId: tenant._id, date: dateKey, visitorHash, kind });
    } catch {
      // Duplicate key (already counted today) or any other write hiccup —
      // either way, don't increment the rollup, and don't log a duplicate
      // key as though it were a real error.
      return new NextResponse(null, { status: 204 });
    }

    await VisitRollup.findOneAndUpdate(
      { tenantId: tenant._id, date: dateKey },
      { $inc: { [ROLLUP_FIELD[kind]]: 1 } },
      { upsert: true }
    );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("Tracking beacon failed:", err);
    return new NextResponse(null, { status: 204 });
  }
}

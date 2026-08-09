import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import PageReport from "@/lib/models/PageReport";
import { getServerT } from "@/lib/i18n/server";
import { normalizeReport, looksAutomated } from "@/lib/moderation";

// Public and unauthenticated by design: someone who lands on an abusive page
// has no account here, and requiring one would mean most abuse is never
// reported. Three things keep that from being an open door:
//
//   1. A per-IP rate limit (bucket "pageReport", applied in proxy.js).
//   2. The bot heuristics in lib/moderation.js — a honeypot field and a
//      minimum fill time.
//   3. A per-IP-per-page duplicate window, so one person hammering the
//      button doesn't manufacture the appearance of a pile-on.
//
// Nothing here changes what the public sees. A report is evidence for a human
// to review, never an automatic takedown — otherwise the endpoint would be a
// way to knock a competitor's page offline.

const DUPLICATE_WINDOW_MS = 60 * 60 * 1000;

function clientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function reportErrorMessage(t, err) {
  switch (err.code) {
    case "UNKNOWN_REASON":
      return t("api.report.chooseReason");
    case "INVALID_EMAIL":
      return t("api.report.invalidEmail");
    case "NOTES_REQUIRED":
      return t("api.report.notesRequired");
    default:
      return t("api.common.somethingWentWrong");
  }
}

export async function POST(request) {
  const { t } = await getServerT();

  const body = (await request.json().catch(() => null)) ?? {};
  const { tenantSlug } = body;

  if (!tenantSlug || typeof tenantSlug !== "string") {
    return NextResponse.json({ error: t("api.common.somethingWentWrong") }, { status: 400 });
  }

  let clean;
  try {
    clean = normalizeReport(body);
  } catch (err) {
    return NextResponse.json({ error: reportErrorMessage(t, err) }, { status: 400 });
  }

  // A bot gets the same success response a person does. Telling automation
  // that it was detected just tells the author what to change.
  const automated = looksAutomated({ honeypot: body.website, elapsedMs: body.elapsedMs });

  try {
    await connectDB();

    const tenant = await Tenant.findOne({ slug: tenantSlug }).select("slug").lean();
    if (!tenant) {
      // Same generic success: whether a given slug exists isn't something an
      // unauthenticated caller needs to be able to enumerate from here.
      return NextResponse.json({ ok: true });
    }

    if (automated) return NextResponse.json({ ok: true });

    const ip = clientIp(request);

    // One report per person per page per hour. Beyond that it's the same
    // complaint, and 40 copies of it makes the queue harder to read, not the
    // case stronger.
    const recent = await PageReport.findOne({
      tenantId: tenant._id,
      reporterIp: ip,
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    })
      .select("_id")
      .lean();

    if (recent) return NextResponse.json({ ok: true, duplicate: true });

    await PageReport.create({
      tenantId: tenant._id,
      tenantSlug: tenant.slug,
      reason: clean.reason,
      notes: clean.notes,
      reporterEmail: clean.reporterEmail,
      reporterIp: ip,
      userAgent: String(request.headers.get("user-agent") || "").slice(0, 300),
    });

    // Denormalized onto the tenant so the admin queue can sort and badge
    // without an aggregation per row.
    await Tenant.updateOne(
      { _id: tenant._id },
      {
        $inc: { "moderation.openReportCount": 1 },
        $set: { "moderation.lastReportedAt": new Date() },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Page report submission failed:", err);
    return NextResponse.json({ error: t("api.report.failed") }, { status: 503 });
  }
}

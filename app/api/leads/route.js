import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import User from "@/lib/models/User";
import LeadActivity from "@/lib/models/LeadActivity";
import { defaultFormFields, isChoiceType } from "@/lib/formFields";
import { sendNewLeadNotificationEmail, getAppUrl } from "@/lib/email";
import { sendLeadWebhook } from "@/lib/webhooks";

const MAX_FIELD_LENGTH = 2000;

/**
 * Flattens whatever the visitor submitted for one field into the single
 * string the Lead document stores.
 *
 * A checkbox group arrives as an array; it's joined rather than stored
 * structurally so every existing CRM surface (leads table, lead detail,
 * exports, the WhatsApp outreach message) keeps reading one value per field
 * with no special case of its own.
 *
 * Choice answers are also checked against the tenant's own option list — a
 * hand-built request otherwise gets to write arbitrary text into what the
 * owner set up as a fixed list.
 */
function readSubmittedValue(field, raw) {
  const clean = (v) => String(v ?? "").trim().slice(0, MAX_FIELD_LENGTH);

  if (!isChoiceType(field.type)) {
    return typeof raw === "string" ? clean(raw) : "";
  }

  const allowed = new Set(Array.isArray(field.options) ? field.options : []);
  const values = (Array.isArray(raw) ? raw : [raw])
    .map(clean)
    .filter((v) => v && allowed.has(v));

  return [...new Set(values)].join(", ").slice(0, MAX_FIELD_LENGTH);
}

/**
 * Recipient is the tenant's own configured contact address if they've set
 * one in Settings; otherwise falls back to the account owner's login email,
 * so the toggle still does something for a tenant who hasn't filled in a
 * company profile yet.
 */
async function notifyNewLead(tenant, lead) {
  let to = tenant.profile?.contactEmail || "";
  if (!to) {
    const owner = await User.findOne({ tenantId: tenant._id, role: "owner" })
      .select("email")
      .lean();
    to = owner?.email || "";
  }
  if (!to) return;

  // No locale argument: the request here is the anonymous visitor's, not the
  // tenant's, so getServerT() would resolve the wrong party's cookie — and no
  // per-tenant language preference is persisted yet. Defaults to English
  // (sendNewLeadNotificationEmail's own default) until one exists.
  await sendNewLeadNotificationEmail(to, {
    leadName: lead.name,
    tenantName: tenant.name,
    leadUrl: `${getAppUrl()}/t/${tenant.slug}/leads/${lead._id.toString()}`,
  });
}

// Public endpoint — called from a tenant's landing page lead form.
// No auth required (visitors aren't logged in), but every lead is tagged
// with the tenant it belongs to so it only ever shows up in that tenant's CRM.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const { tenantSlug, fields: submitted, variant } = body ?? {};

  if (!tenantSlug || typeof submitted !== "object" || submitted === null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    await connectDB();

    const tenant = await Tenant.findOne({ slug: tenantSlug })
      .select(
        "slug name landingPage.formFields notifications.emailOnNewLead notifications.webhookUrl profile.contactEmail"
      )
      .lean();
    if (!tenant) {
      return NextResponse.json({ error: "Unknown company." }, { status: 404 });
    }

    // The tenant's OWN saved field configuration is the source of truth for
    // what's required and where each answer lands on the Lead document —
    // never trust the shape of the request beyond the raw text values, or a
    // crafted payload could write into arbitrary fields.
    const configuredFields = tenant.landingPage?.formFields?.length
      ? tenant.landingPage.formFields
      : defaultFormFields();

    const lead = {
      tenantId: tenant._id,
      customFields: [],
      // The follow-up clock starts the moment the lead arrives — an enquiry
      // nobody answers for a week is exactly what the reminder is for.
      lastActivityAt: new Date(),
      // Narrowed to the only two real values rather than trusting the
      // request body directly — an unrecognised value silently becomes "no
      // variant" rather than a validation error, since this is informational
      // only and shouldn't be able to block a real submission.
      landingVariant: variant === "a" || variant === "b" ? variant : null,
    };

    for (const field of configuredFields) {
      const value = readSubmittedValue(field, submitted[field.key]);

      if (field.required && !value) {
        return NextResponse.json(
          { error: `"${field.label || field.key}" is required.` },
          { status: 400 }
        );
      }

      if (field.crmField && field.crmField !== "custom") {
        lead[field.crmField] = value;
      } else if (value) {
        // Only non-empty custom answers are stored — an unanswered optional
        // field shouldn't clutter every lead's detail page.
        lead.customFields.push({ key: field.key, label: field.label || field.key, value });
      }
    }

    // Every other CRM surface (leads list, pipeline board, overview) assumes
    // a lead has a name. The form editor won't let "name" be removed or made
    // optional, but this guards the same invariant against a hand-built
    // request that skips the client entirely.
    if (!lead.name) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const created = await Lead.create(lead);

    // The first entry in every lead's timeline — best-effort, same reasoning
    // as the email notification below: a logging failure must never fail
    // the visitor's submission.
    try {
      await LeadActivity.create({ tenantId: tenant._id, leadId: created._id, type: "lead_captured" });
    } catch (logErr) {
      console.error("Logging lead-captured activity failed:", logErr);
    }

    // Best-effort and awaited (not fire-and-forget) — a serverless function
    // can be frozen the instant its response is sent, so an un-awaited send
    // here could silently never complete. Failure still never blocks the
    // lead submission itself; only its own outcome is swallowed.
    // Both instant-notification channels run here, independently: a tenant
    // can have either, both, or neither, and one failing must not stop the
    // other. Same await-but-swallow policy for both — see above.
    const notifications = [];

    if (tenant.notifications?.emailOnNewLead) {
      notifications.push(
        notifyNewLead(tenant, created).catch((emailErr) => {
          console.error("Sending new-lead notification email failed:", emailErr);
        })
      );
    }

    if (tenant.notifications?.webhookUrl) {
      notifications.push(
        sendLeadWebhook(tenant.notifications.webhookUrl, {
          event: "lead.created",
          createdAt: created.createdAt,
          tenant: { slug: tenant.slug, name: tenant.name },
          lead: {
            id: created._id.toString(),
            name: created.name,
            email: created.email,
            phone: created.phone,
            message: created.message,
            stage: created.stage,
            // Same snapshot shape the lead detail page reads, so a webhook
            // consumer sees exactly what the CRM shows.
            customFields: created.customFields.map((f) => ({
              key: f.key,
              label: f.label,
              value: f.value,
            })),
            url: `${getAppUrl()}/t/${tenant.slug}/leads/${created._id.toString()}`,
          },
        })
      );
    }

    if (notifications.length) await Promise.all(notifications);

    return NextResponse.json({ ok: true, leadId: created._id.toString() });
  } catch (err) {
    console.error("Lead submission failed:", err);
    return NextResponse.json(
      { error: "Could not save your submission right now. Please try again shortly." },
      { status: 503 }
    );
  }
}

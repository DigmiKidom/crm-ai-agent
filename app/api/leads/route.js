import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";
import User from "@/lib/models/User";
import { defaultFormFields } from "@/lib/formFields";
import { sendNewLeadNotificationEmail, getAppUrl } from "@/lib/email";

const MAX_FIELD_LENGTH = 2000;

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
      .select("slug name landingPage.formFields notifications.emailOnNewLead profile.contactEmail")
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
      // Narrowed to the only two real values rather than trusting the
      // request body directly — an unrecognised value silently becomes "no
      // variant" rather than a validation error, since this is informational
      // only and shouldn't be able to block a real submission.
      landingVariant: variant === "a" || variant === "b" ? variant : null,
    };

    for (const field of configuredFields) {
      const raw = submitted[field.key];
      const value = typeof raw === "string" ? raw.trim().slice(0, MAX_FIELD_LENGTH) : "";

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

    // Best-effort and awaited (not fire-and-forget) — a serverless function
    // can be frozen the instant its response is sent, so an un-awaited send
    // here could silently never complete. Failure still never blocks the
    // lead submission itself; only its own outcome is swallowed.
    if (tenant.notifications?.emailOnNewLead) {
      try {
        await notifyNewLead(tenant, created);
      } catch (emailErr) {
        console.error("Sending new-lead notification email failed:", emailErr);
      }
    }

    return NextResponse.json({ ok: true, leadId: created._id.toString() });
  } catch (err) {
    console.error("Lead submission failed:", err);
    return NextResponse.json(
      { error: "Could not save your submission right now. Please try again shortly." },
      { status: 503 }
    );
  }
}

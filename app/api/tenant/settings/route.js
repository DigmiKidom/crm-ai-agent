import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Media from "@/lib/models/Media";
import { requireTenantRole } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";
import { normalizeAgentPreferences } from "@/lib/agentPreferences";
import { isAllowedWebhookUrl } from "@/lib/webhooks";
import { DEFAULT_OUTREACH_TEMPLATE, MAX_OUTREACH_TEMPLATE } from "@/lib/socialLinks";
import { normalizeInterval } from "@/lib/followUp";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function str(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export async function PATCH(request) {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const {
    name,
    profile = {},
    theme = {},
    logoMediaId,
    notifications = {},
    outreach = {},
    agentPreferences,
    currency,
  } = body;

  const companyName = str(name, 120);
  if (!companyName) {
    return NextResponse.json({ error: t("api.tenantSettings.companyNameRequired") }, { status: 400 });
  }

  // A 3-letter code, not a strict ISO 4217 membership check — this only
  // ever labels dealValue figures via Intl.NumberFormat, which throws its
  // own clear error for a code it doesn't recognize, so there's no need to
  // duplicate its currency list here.
  const currencyCode = str(currency, 3).toUpperCase() || "USD";
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return NextResponse.json({ error: t("api.tenantSettings.invalidCurrency") }, { status: 400 });
  }

  const contactEmail = str(profile.contactEmail, 160);
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return NextResponse.json({ error: t("api.tenantSettings.invalidContactEmail") }, { status: 400 });
  }

  // Rejected rather than silently ignored: a tenant who pastes an http:// or
  // internal URL here would otherwise believe their leads are being delivered
  // somewhere they never arrive. See lib/webhooks.js for what's allowed.
  const webhookUrl = str(notifications.webhookUrl, 500);
  if (webhookUrl && !isAllowedWebhookUrl(webhookUrl)) {
    return NextResponse.json({ error: t("api.tenantSettings.invalidWebhookUrl") }, { status: 400 });
  }

  for (const [key, value] of [
    ["primaryColor", theme.primaryColor],
    ["accentColor", theme.accentColor],
  ]) {
    if (value && !HEX_COLOR.test(value)) {
      const field =
        key === "primaryColor" ? t("api.tenantSettings.primaryColor") : t("api.tenantSettings.accentColor");
      return NextResponse.json(
        { error: t("api.tenantSettings.invalidHexColour", { field }) },
        { status: 400 }
      );
    }
  }

  // A logo id must be a real Media row that belongs to this tenant — otherwise
  // a tenant could point at someone else's image just by pasting an id.
  let logoId = null;
  if (logoMediaId) {
    if (!mongoose.isValidObjectId(logoMediaId)) {
      return NextResponse.json({ error: t("api.tenantSettings.invalidLogoReference") }, { status: 400 });
    }
    logoId = logoMediaId;
  }

  try {
    await connectDB();

    if (logoId) {
      const owned = await tenantScoped(Media, tenantId).exists({ _id: logoId });
      if (!owned) {
        return NextResponse.json({ error: t("api.tenantSettings.logoNotFound") }, { status: 400 });
      }
    }

    const $set = {
      name: companyName,
      currency: currencyCode,
      "profile.legalName": str(profile.legalName, 160),
      "profile.tagline": str(profile.tagline, 160),
      "profile.about": str(profile.about, 600),
      "profile.contactEmail": contactEmail,
      "profile.contactPhone": str(profile.contactPhone, 40),
      "profile.addressLine": str(profile.addressLine, 200),
      "profile.city": str(profile.city, 80),
      "profile.country": str(profile.country, 80),
      "profile.website": str(profile.website, 200),
      "profile.social.facebook": str(profile.social?.facebook, 200),
      "profile.social.instagram": str(profile.social?.instagram, 200),
      "profile.social.linkedin": str(profile.social?.linkedin, 200),
      "profile.social.x": str(profile.social?.x, 200),
      logoMediaId: logoId,
      "notifications.emailOnNewLead": Boolean(notifications.emailOnNewLead),
      "notifications.webhookUrl": webhookUrl,
      "outreach.whatsappTemplate": str(outreach.whatsappTemplate, MAX_OUTREACH_TEMPLATE) || DEFAULT_OUTREACH_TEMPLATE,
      "outreach.followUpInterval": normalizeInterval(outreach.followUpInterval),
      // Empty is meaningful here, unlike the outreach template: it means
      // "use the translated default", so a tenant who clears the box gets
      // the message in their own language rather than a blank one.
      "outreach.followUpTemplate": str(outreach.followUpTemplate, MAX_OUTREACH_TEMPLATE),
      // Same brand-voice knobs onboarding sets, editable here without a full
      // "AI Setup" regenerate — see lib/agentPreferences.js.
      agentPreferences: normalizeAgentPreferences(agentPreferences),
    };

    if (theme.primaryColor) $set["theme.primaryColor"] = theme.primaryColor;
    if (theme.accentColor) $set["theme.accentColor"] = theme.accentColor;
    if (theme.fontFamily) $set["theme.fontFamily"] = str(theme.fontFamily, 200);

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set },
      { new: true }
    ).lean();

    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Updating settings failed:", err);
    return NextResponse.json({ error: t("api.tenantSettings.saveFailed") }, { status: 503 });
  }
}

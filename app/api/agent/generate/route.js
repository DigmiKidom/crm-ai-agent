import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant, { MAX_FEATURES } from "@/lib/models/Tenant";
import Pipeline from "@/lib/models/Pipeline";
import AgentSession from "@/lib/models/AgentSession";
import { generateSiteConfig } from "@/lib/agent";
import { getTemplate } from "@/lib/templates";
import { isValidIconKey } from "@/lib/landingIcons";
import { AUTO_LANGUAGE, resolveContentLanguage } from "@/lib/i18n/languages";
import { describeCompanySize, normalizeCompanySize } from "@/lib/companySize";
import { normalizeAgentPreferences } from "@/lib/agentPreferences";
import { requireTenantRole } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function POST(request) {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const body = await request.json();
  const {
    industry,
    companySize,
    leadDefinition,
    tone,
    personality,
    style,
    targetAudience,
    technology,
    brandColor,
    language,
  } = body ?? {};

  if (!industry || !leadDefinition) {
    return NextResponse.json(
      { error: t("api.agentGenerate.missingRequiredFields") },
      { status: 400 }
    );
  }

  // Same trust boundary as every other tenant-writable preference: narrow to
  // known values rather than trusting the request shape, since this is what
  // both the AI prompt and the persisted Tenant document end up built from.
  const preferences = normalizeAgentPreferences({ tone, personality, style, targetAudience, technology });

  try {
    await connectDB();

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    const config = await generateSiteConfig({
      companyName: tenant.name,
      industry,
      // Legacy numeric values from older sessions map onto a tier rather than
      // reaching the prompt as "51-200".
      companySize: describeCompanySize(companySize),
      leadDefinition,
      ...preferences,
      language: language || AUTO_LANGUAGE,
    });

    // Dotted paths, not a whole `landingPage` object — re-running AI setup
    // should refresh the copy without wiping the tenant's uploaded background
    // photos, overlay strength, or logo preference.
    const update = {
      industry,
      companySize: normalizeCompanySize(companySize),
      agentPreferences: preferences,
      templateId: config.templateId,
      "landingPage.headline": config.headline,
      "landingPage.subheadline": config.subheadline,
      "landingPage.ctaLabel": config.ctaLabel,
      "landingPage.features": (config.features || []).slice(0, MAX_FEATURES).map((f) => ({
        title: f.title,
        description: (f.description || "").slice(0, 300),
        icon: isValidIconKey(f.icon) ? f.icon : "",
      })),
      // What the agent reports it actually wrote in — which is not necessarily
      // what was requested, and is the value the public page must trust.
      "landingPage.language": resolveContentLanguage(config.languageCode, config.languageName),
      "landingPage.galleryHeading": config.galleryHeading || "",
      "landingPage.contactHeading": config.contactHeading || "",
    };

    // Written field-by-field so a partial response can't blank out labels the
    // tenant already had. lib/landingCopy.js fills any remaining gaps.
    const formLabels = config.formLabels ?? {};
    for (const key of ["name", "email", "phone", "message", "sending", "success", "error"]) {
      if (typeof formLabels[key] === "string" && formLabels[key].trim()) {
        update[`landingPage.formLabels.${key}`] = formLabels[key].trim();
      }
    }
    if (brandColor) update["theme.primaryColor"] = brandColor;

    const updatedTenant = await Tenant.findByIdAndUpdate(tenantId, { $set: update }, { new: true });

    await tenantScoped(Pipeline, tenantId).findOneAndUpdate(
      {},
      { stages: config.pipelineStages.map((s) => s.toLowerCase()) },
      { upsert: true }
    );

    await tenantScoped(AgentSession, tenantId).create({
      input: {
        industry,
        companySize,
        leadDefinition,
        ...preferences,
        brandColor,
        language: language || AUTO_LANGUAGE,
      },
      output: config,
    });

    return NextResponse.json({
      ok: true,
      tenantSlug: updatedTenant.slug,
      templateId: config.templateId,
      templateName: getTemplate(config.templateId).name,
      language: update["landingPage.language"],
    });
  } catch (err) {
    console.error("AI agent generation failed:", err);
    const message = /GOOGLE_API_KEY/.test(err.message || "")
      ? t("api.agentGenerate.notConfigured")
      : t("api.agentGenerate.failed");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

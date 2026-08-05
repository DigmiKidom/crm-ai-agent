import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant, { MAX_FEATURES } from "@/lib/models/Tenant";
import Pipeline from "@/lib/models/Pipeline";
import AgentSession from "@/lib/models/AgentSession";
import { generateSiteConfig } from "@/lib/agent";
import { getTemplate } from "@/lib/templates";
import { isValidIconKey } from "@/lib/landingIcons";

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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
  } = body ?? {};

  if (!industry || !leadDefinition) {
    return NextResponse.json(
      { error: "Industry and lead definition are required." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const tenant = await Tenant.findById(session.user.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    const config = await generateSiteConfig({
      companyName: tenant.name,
      industry,
      companySize: companySize || "unspecified",
      leadDefinition,
      tone: tone || "professional",
      personality: Array.isArray(personality) ? personality : [],
      style: style || "modern",
      targetAudience: Array.isArray(targetAudience) ? targetAudience : [],
      technology: technology || "balanced",
    });

    // Dotted paths, not a whole `landingPage` object — re-running AI setup
    // should refresh the copy without wiping the tenant's uploaded background
    // photos, overlay strength, or logo preference.
    const update = {
      industry,
      templateId: config.templateId,
      "landingPage.headline": config.headline,
      "landingPage.subheadline": config.subheadline,
      "landingPage.ctaLabel": config.ctaLabel,
      "landingPage.features": (config.features || []).slice(0, MAX_FEATURES).map((f) => ({
        title: f.title,
        description: (f.description || "").slice(0, 300),
        icon: isValidIconKey(f.icon) ? f.icon : "",
      })),
    };
    if (brandColor) update["theme.primaryColor"] = brandColor;

    const updatedTenant = await Tenant.findByIdAndUpdate(tenant._id, { $set: update }, { new: true });

    await Pipeline.findOneAndUpdate(
      { tenantId: tenant._id },
      { stages: config.pipelineStages.map((s) => s.toLowerCase()) },
      { upsert: true }
    );

    await AgentSession.create({
      tenantId: tenant._id,
      input: {
        industry,
        companySize,
        leadDefinition,
        tone,
        personality,
        style,
        targetAudience,
        technology,
        brandColor,
      },
      output: config,
    });

    return NextResponse.json({
      ok: true,
      tenantSlug: updatedTenant.slug,
      templateId: config.templateId,
      templateName: getTemplate(config.templateId).name,
    });
  } catch (err) {
    console.error("AI agent generation failed:", err);
    const message = /GOOGLE_API_KEY/.test(err.message || "")
      ? "The AI agent isn't configured yet — add GOOGLE_API_KEY to your environment."
      : "Could not generate your site right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

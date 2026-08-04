import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Pipeline from "@/lib/models/Pipeline";
import AgentSession from "@/lib/models/AgentSession";
import { generateSiteConfig } from "@/lib/agent";
import { getTemplate } from "@/lib/templates";

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { industry, companySize, leadDefinition, tone, brandColor } = body ?? {};

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
    });

    const update = {
      industry,
      templateId: config.templateId,
      landingPage: {
        headline: config.headline,
        subheadline: config.subheadline,
        ctaLabel: config.ctaLabel,
        features: config.features,
      },
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
      input: { industry, companySize, leadDefinition, tone, brandColor },
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
    const message = /ANTHROPIC_API_KEY/.test(err.message || "")
      ? "The AI agent isn't configured yet — add ANTHROPIC_API_KEY to your environment."
      : "Could not generate your site right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

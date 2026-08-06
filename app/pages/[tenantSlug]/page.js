import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import User from "@/lib/models/User";
import Resume from "@/lib/models/Resume";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { resolveLandingCopy } from "@/lib/landingCopy";

// Team members, only fetched when the tenant has actually switched the
// section on — every other landing page pays nothing for this. A team
// member's CV link is only ever included if THEY made it public (see
// Resume.isPublic) — inviting someone onto the team never publishes their
// CV for them.
async function loadTeamMembers(tenantId) {
  const [users, resumes] = await Promise.all([
    User.find({ tenantId }).select("name title avatarMediaId").sort({ createdAt: 1 }).lean(),
    Resume.find({ tenantId, isPublic: true }).select("userId").lean(),
  ]);

  const publicResumeByUser = new Map(resumes.map((r) => [r.userId.toString(), r._id.toString()]));

  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name || "",
    title: u.title || "",
    avatarMediaId: u.avatarMediaId ? u.avatarMediaId.toString() : null,
    publicResumeId: publicResumeByUser.get(u._id.toString()) || null,
  }));
}

export const revalidate = 60; // ISR: re-check the tenant config once a minute

export async function generateMetadata({ params }) {
  const { tenantSlug } = await params;

  try {
    await connectDB();
    const tenant = await Tenant.findOne({ slug: tenantSlug })
      .select("name landingPage.headline landingPage.subheadline landingPage.language")
      .lean();
    if (!tenant) return {};

    const copy = resolveLandingCopy(tenant);
    return {
      // Overrides the root layout's "%s · Ceramony" template: a tenant's
      // public page is their brand, not ours.
      title: { absolute: `${tenant.name} — ${tenant.landingPage?.headline || ""}`.trim() },
      description: copy.subheadline,
      openGraph: { locale: copy.language.code },
    };
  } catch {
    return {};
  }
}

export default async function TenantLandingPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  // ?template=<id> lets the dashboard preview any of the 4 templates against
  // this tenant's real content without saving anything — the query param
  // never touches the database.
  const { template: previewTemplateId } = (await searchParams) || {};

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  if (!tenant) notFound();

  const templateId =
    previewTemplateId && TEMPLATES[previewTemplateId] ? previewTemplateId : tenant.templateId;
  const { Component } = getTemplate(templateId);
  const copy = resolveLandingCopy(tenant);

  const teamMembers = tenant.landingPage?.showTeamSection
    ? await loadTeamMembers(tenant._id)
    : [];

  // dir/lang come from the tenant's content language, NOT from the viewer's
  // UI preference. A Hebrew business's page must render right-to-left for
  // every visitor, including one whose own dashboard is in English — so this
  // deliberately overrides the <html dir> the root layout set.
  return (
    <div dir={copy.language.dir} lang={copy.language.code}>
      <Component tenant={{ ...JSON.parse(JSON.stringify(tenant)), teamMembers }} />
    </div>
  );
}

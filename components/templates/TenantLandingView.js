import User from "@/lib/models/User";
import Resume from "@/lib/models/Resume";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { resolveLandingCopy } from "@/lib/landingCopy";
import VisitBeacon from "./shared/VisitBeacon";

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

/**
 * Renders one tenant's public landing page from an already-resolved Tenant
 * document. Shared by both ways a visitor can reach it:
 *   - app/pages/[tenantSlug]/page.js  — the canonical ceramony.co/pages/slug URL
 *   - app/custom-domain/page.js       — a tenant's own verified hostname
 * so picking a template, resolving copy, loading the team section, and
 * firing the visit beacon can't drift between the two entry points.
 */
export default async function TenantLandingView({ tenant, previewTemplateId }) {
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
      {/* Never fires for the dashboard's own ?template= preview — that's the
          tenant looking at their own site, not a real visitor. */}
      {!previewTemplateId && <VisitBeacon tenantSlug={tenant.slug} />}
      <Component tenant={{ ...JSON.parse(JSON.stringify(tenant)), teamMembers }} />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { resolveLandingCopy } from "@/lib/landingCopy";
import TenantLandingView from "@/components/templates/TenantLandingView";

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

  // Blocked by a platform admin — see app/suspended/route.js, which serves the
  // notice with a real 451. Checked before anything renders, so no part of the
  // suspended content reaches the response. The ISR cache for this path is
  // dropped at block time (revalidatePath in the admin route), so a takedown
  // is immediate rather than up to `revalidate` seconds later.
  if (tenant.moderation?.pageBlocked) redirect("/suspended");

  return <TenantLandingView tenant={tenant} previewTemplateId={previewTemplateId} />;
}

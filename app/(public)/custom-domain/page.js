import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { resolveLandingCopy } from "@/lib/landingCopy";
import TenantLandingView from "@/components/templates/TenantLandingView";

// Reached only via proxy.js's rewrite: a request whose Host header isn't
// this app's own domain gets rewritten here with the raw hostname attached
// as ?host=, since middleware runs on the Edge runtime and can't make the
// MongoDB lookup itself (Mongoose needs Node.js) — this Server Component
// does that lookup instead. Never linked to directly; there's nothing at
// this path for a visitor on the main app domain.
//
// Not ISR-cached like /pages/[tenantSlug] (there, the tenant slug IS the
// cache key; here, an arbitrary Host header is not something Next's
// per-route ISR cache can key on the same way) — ISR/ie ISR support across
// custom hostnames on one Vercel project is the kind of thing worth
// revisiting once a tenant is actually running on one.
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const { host } = (await searchParams) || {};
  if (!host) return {};

  try {
    await connectDB();
    const tenant = await Tenant.findOne({
      "customDomain.hostname": host.toLowerCase(),
      "customDomain.status": "verified",
    })
      .select("name landingPage.headline landingPage.subheadline landingPage.language")
      .lean();
    if (!tenant) return {};

    const copy = resolveLandingCopy(tenant);
    return {
      title: { absolute: `${tenant.name} — ${tenant.landingPage?.headline || ""}`.trim() },
      description: copy.subheadline,
      openGraph: { locale: copy.language.code },
    };
  } catch {
    return {};
  }
}

export default async function CustomDomainLandingPage({ searchParams }) {
  const { host } = (await searchParams) || {};
  if (!host) notFound();

  await connectDB();
  const tenant = await Tenant.findOne({
    "customDomain.hostname": host.toLowerCase(),
    "customDomain.status": "verified",
  }).lean();

  if (!tenant) notFound();

  // Same block check as /pages/[tenantSlug] — a tenant on their own hostname
  // must not be a way around a takedown.
  if (tenant.moderation?.pageBlocked) redirect("/suspended");

  return <TenantLandingView tenant={tenant} />;
}

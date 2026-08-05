import { redirect } from "next/navigation";

// The public landing page lives at /pages/[tenantSlug] now. This route stays
// in place purely so any links already shared as /l/<slug> keep working.
export default async function LegacyLandingPageRedirect({ params }) {
  const { tenantSlug } = await params;
  redirect(`/pages/${tenantSlug}`);
}

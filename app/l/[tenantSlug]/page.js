import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { getTemplate } from "@/lib/templates";

export const revalidate = 60; // ISR: re-check the tenant config once a minute

export default async function TenantLandingPage({ params }) {
  const { tenantSlug } = await params;

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug }).lean();

  if (!tenant) notFound();

  const { Component } = getTemplate(tenant.templateId);

  return <Component tenant={JSON.parse(JSON.stringify(tenant))} />;
}

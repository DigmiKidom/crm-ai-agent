import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { getTemplate, TEMPLATES } from "@/lib/templates";

export const revalidate = 60; // ISR: re-check the tenant config once a minute

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

  return <Component tenant={JSON.parse(JSON.stringify(tenant))} />;
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import Lead from "@/lib/models/Lead";

// Public endpoint — called from a tenant's landing page lead form.
// No auth required (visitors aren't logged in), but every lead is tagged
// with the tenant it belongs to so it only ever shows up in that tenant's CRM.
export async function POST(request) {
  const body = await request.json();
  const { tenantSlug, name, email, phone, message } = body ?? {};

  if (!tenantSlug || !name || !email) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  await connectDB();

  const tenant = await Tenant.findOne({ slug: tenantSlug });
  if (!tenant) {
    return NextResponse.json({ error: "Unknown company." }, { status: 404 });
  }

  const lead = await Lead.create({
    tenantId: tenant._id,
    name,
    email,
    phone: phone || "",
    message: message || "",
  });

  return NextResponse.json({ ok: true, leadId: lead._id.toString() });
}

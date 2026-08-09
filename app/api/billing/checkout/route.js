import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { billingConfigured, createCheckoutSession } from "@/lib/stripe";
import { getAppUrl } from "@/lib/email";
import { requireTenantRole } from "@/lib/tenantSession";

// Billing is a tenant-config action, same bracket as Settings/landing-page —
// admin/owner only (see lib/roles.js).
export async function POST() {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  if (!billingConfigured()) {
    return NextResponse.json({ error: t("api.billing.notConfigured") }, { status: 503 });
  }

  try {
    await connectDB();

    const tenant = await Tenant.findById(tenantId).select("stripeCustomerId profile.contactEmail").lean();
    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    const base = `${getAppUrl()}/t/${session.user.tenantSlug}/settings`;
    const url = await createCheckoutSession({
      tenant,
      successUrl: `${base}?billing=success`,
      cancelUrl: `${base}?billing=cancelled`,
    });

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("Creating checkout session failed:", err);
    return NextResponse.json({ error: t("api.billing.checkoutFailed") }, { status: 502 });
  }
}

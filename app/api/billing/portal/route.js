import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import { billingConfigured, createPortalSession } from "@/lib/stripe";
import { getAppUrl } from "@/lib/email";
import { requireTenantRole } from "@/lib/tenantSession";

export async function POST() {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  if (!billingConfigured()) {
    return NextResponse.json({ error: t("api.billing.notConfigured") }, { status: 503 });
  }

  try {
    await connectDB();

    const tenant = await Tenant.findById(tenantId).select("stripeCustomerId").lean();
    if (!tenant?.stripeCustomerId) {
      return NextResponse.json({ error: t("api.billing.noSubscription") }, { status: 400 });
    }

    const url = await createPortalSession({
      tenant,
      returnUrl: `${getAppUrl()}/t/${session.user.tenantSlug}/settings`,
    });

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("Creating billing portal session failed:", err);
    return NextResponse.json({ error: t("api.billing.portalFailed") }, { status: 502 });
  }
}

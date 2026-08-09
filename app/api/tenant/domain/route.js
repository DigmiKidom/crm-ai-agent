import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import {
  domainsConfigured,
  addDomainToProject,
  checkDomainStatus,
  removeDomainFromProject,
} from "@/lib/vercelDomains";
import { requireTenantRole } from "@/lib/tenantSession";

// A conservative hostname check — lowercase letters/digits/hyphens per
// label, at least one dot. Rejects garbage before it ever reaches Vercel's
// API rather than relying on their error message alone.
const HOSTNAME_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export async function POST(request) {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  if (!domainsConfigured()) {
    return NextResponse.json({ error: t("api.domain.notConfigured") }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const hostname = String(body.hostname || "").trim().toLowerCase();

  if (!hostname || !HOSTNAME_RE.test(hostname)) {
    return NextResponse.json({ error: t("api.domain.invalidHostname") }, { status: 400 });
  }

  try {
    await connectDB();

    const { verified, verification } = await addDomainToProject(hostname);

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      {
        $set: {
          customDomain: {
            hostname,
            status: verified ? "verified" : "pending",
            verification,
            addedAt: new Date(),
          },
        },
      },
      { new: true }
    )
      .select("customDomain")
      .lean();

    return NextResponse.json({ ok: true, customDomain: tenant.customDomain });
  } catch (err) {
    console.error("Adding custom domain failed:", err);
    return NextResponse.json({ error: err.message || t("api.domain.addFailed") }, { status: 502 });
  }
}

// Re-checks verification status against Vercel — a tenant clicks "Check
// status" after updating their DNS, rather than this polling on its own.
export async function GET() {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();

    const tenant = await Tenant.findById(tenantId).select("customDomain").lean();
    if (!tenant?.customDomain?.hostname) {
      return NextResponse.json({ error: t("api.domain.noneConfigured") }, { status: 404 });
    }

    if (!domainsConfigured()) {
      return NextResponse.json({ ok: true, customDomain: tenant.customDomain });
    }

    const { verified, misconfigured, verification } = await checkDomainStatus(
      tenant.customDomain.hostname
    );

    const status = verified && !misconfigured ? "verified" : misconfigured ? "error" : "pending";

    const updated = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: { "customDomain.status": status, "customDomain.verification": verification } },
      { new: true }
    )
      .select("customDomain")
      .lean();

    return NextResponse.json({ ok: true, customDomain: updated.customDomain });
  } catch (err) {
    console.error("Checking custom domain status failed:", err);
    return NextResponse.json({ error: err.message || t("api.domain.checkFailed") }, { status: 502 });
  }
}

export async function DELETE() {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();

    const tenant = await Tenant.findById(tenantId).select("customDomain").lean();
    const hostname = tenant?.customDomain?.hostname;

    if (hostname && domainsConfigured()) {
      try {
        await removeDomainFromProject(hostname);
      } catch (err) {
        // Still clear it from the tenant even if Vercel's side fails (e.g.
        // it was already removed there manually) — a stuck local record
        // with nothing to manage it is worse than a domain removed from
        // Vercel a moment before this record catches up.
        console.error("Removing domain from Vercel project failed:", err);
      }
    }

    await Tenant.findByIdAndUpdate(tenantId, {
      $set: { customDomain: { hostname: null, status: "pending", verification: null, addedAt: null } },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Removing custom domain failed:", err);
    return NextResponse.json({ error: t("api.domain.removeFailed") }, { status: 502 });
  }
}

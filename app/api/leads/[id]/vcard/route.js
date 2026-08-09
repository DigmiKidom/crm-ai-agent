import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import Tenant from "@/lib/models/Tenant";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";
import { buildVCard, vcardFilename } from "@/lib/vcard";

/**
 * The lead as a downloadable .vcf.
 *
 * Server-side as well as client-side (AddToContactsButton builds the same
 * card in the browser for the Web Share path) because a plain link that a
 * phone can open is the most reliable way to get a contact into iOS Contacts:
 * Safari hands a served .vcf straight to the Contacts app, no JavaScript
 * involved. The browser path is the enhancement; this is the floor.
 */
export async function GET(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId, locale } = ctx;

  const { id } = await params;

  try {
    await connectDB();

    const [lead, tenant] = await Promise.all([
      tenantScoped(Lead, tenantId)
        .findOne({ _id: id })
        .select("name email phone message notes customFields createdAt")
        .lean(),
      Tenant.findById(tenantId).select("name").lean(),
    ]);

    if (!lead) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }

    const vcard = buildVCard(lead, {
      businessName: tenant?.name || "",
      labels: { captured: t("leads.vcardCaptured"), via: t("leads.vcardVia") },
    });

    return new Response(vcard, {
      headers: {
        // text/vcard is what iOS and Android both register a handler for.
        "Content-Type": "text/vcard; charset=utf-8",
        // The filename is the contact's name, so what lands in Downloads on a
        // desktop is recognisable rather than "route.vcf".
        "Content-Disposition": `attachment; filename="${vcardFilename(lead.name)}"`,
        // Someone else's customer's phone number: never cached by a proxy.
        "Cache-Control": "private, no-store",
        "Content-Language": locale,
      },
    });
  } catch (err) {
    console.error("Building lead vcard failed:", err);
    return NextResponse.json({ error: t("api.leads.loadFailed") }, { status: 503 });
  }
}

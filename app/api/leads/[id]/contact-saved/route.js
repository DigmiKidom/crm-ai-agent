import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/lib/models/Lead";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

/**
 * Records that this lead has been saved to the owner's contacts.
 *
 * We can't read the device's address book, so this is a record of the action
 * taken here, not a claim about what's on the phone. That's enough for its
 * only job: stop showing "new unsaved contact" on someone already saved.
 *
 * Deliberately does NOT count as follow-up activity. Filing a phone number is
 * not talking to a person, and treating it as contact would let an owner
 * silence every reminder by tapping save on each new lead.
 */
export async function POST(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;

  try {
    await connectDB();

    const lead = await tenantScoped(Lead, tenantId)
      .findOneAndUpdate({ _id: id }, { $set: { contactSavedAt: new Date() } }, { new: true })
      .select("contactSavedAt")
      .lean();

    if (!lead) {
      return NextResponse.json({ error: t("api.leads.notFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true, contactSavedAt: lead.contactSavedAt });
  } catch (err) {
    console.error("Recording contact save failed:", err);
    return NextResponse.json({ error: t("api.leads.updateFailed") }, { status: 503 });
  }
}

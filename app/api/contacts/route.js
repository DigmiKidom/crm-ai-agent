import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/lib/models/Contact";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();
    const contacts = await tenantScoped(Contact, tenantId)
      .find()
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ contacts });
  } catch (err) {
    console.error("Fetching contacts failed:", err);
    return NextResponse.json({ error: t("api.contacts.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  const { name, company, email, phone, notes } = await request.json();
  if (!name) {
    return NextResponse.json({ error: t("api.contacts.nameRequired") }, { status: 400 });
  }

  try {
    await connectDB();
    const contact = await tenantScoped(Contact, tenantId).create({
      name,
      company: company || "",
      email: email || "",
      phone: phone || "",
      notes: notes || "",
      ownerId: session.user.id,
    });

    return NextResponse.json({ ok: true, contact });
  } catch (err) {
    console.error("Creating contact failed:", err);
    return NextResponse.json({ error: t("api.contacts.saveFailed") }, { status: 503 });
  }
}

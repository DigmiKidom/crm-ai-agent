import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Contact from "@/lib/models/Contact";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const EDITABLE_FIELDS = ["name", "company", "email", "phone", "notes", "tags"];

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  const body = await request.json();

  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  try {
    await connectDB();

    // Scoped to the caller's tenant by construction (see tenantScoped()) so
    // no one can edit another tenant's contact just by guessing an id.
    const contact = await tenantScoped(Contact, tenantId)
      .findOneAndUpdate({ _id: id }, updates, { new: true })
      .lean();

    if (!contact) {
      return NextResponse.json({ error: t("api.contacts.notFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true, contact });
  } catch (err) {
    console.error("Updating contact failed:", err);
    return NextResponse.json({ error: t("api.contacts.updateFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;

  try {
    await connectDB();
    const contact = await tenantScoped(Contact, tenantId).findOneAndDelete({ _id: id });
    if (!contact) {
      return NextResponse.json({ error: t("api.contacts.notFound") }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting contact failed:", err);
    return NextResponse.json({ error: t("api.contacts.deleteFailed") }, { status: 503 });
  }
}

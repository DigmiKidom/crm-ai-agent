import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Invite from "@/lib/models/Invite";
import { requireTenantRole } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function DELETE(request, { params }) {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;

  try {
    await connectDB();
    const invite = await tenantScoped(Invite, tenantId).findOneAndDelete({ _id: id, acceptedAt: null });
    if (!invite) {
      return NextResponse.json({ error: t("api.invites.notFound") }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Revoking invite failed:", err);
    return NextResponse.json({ error: t("api.invites.revokeFailed") }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import User from "@/lib/models/User";
import Invite from "@/lib/models/Invite";
import { createInvite } from "@/lib/invites";
import { sendTeamInviteEmail, getAppUrl } from "@/lib/email";
import { INVITABLE_ROLES } from "@/lib/roles";
import { requireTenantRole } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function GET() {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();
    const invites = await tenantScoped(Invite, tenantId)
      .find({ acceptedAt: null })
      .select("email role createdAt expiresAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ invites });
  } catch (err) {
    console.error("Listing invites failed:", err);
    return NextResponse.json({ error: t("api.invites.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const email = String(body.email || "").trim().toLowerCase();
  const role = body.role;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: t("api.invites.invalidEmail") }, { status: 400 });
  }
  if (!INVITABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: t("api.invites.invalidRole") }, { status: 400 });
  }

  try {
    await connectDB();

    // Email is globally unique across every tenant (see User schema) — one
    // Ceramony account is always exactly one tenant, so an email that
    // already has an account anywhere can't also accept this invite.
    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      return NextResponse.json({ error: t("api.invites.alreadyHasAccount") }, { status: 409 });
    }

    const tenant = await Tenant.findById(tenantId).select("name").lean();
    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    const rawToken = await createInvite({
      tenantId,
      email,
      role,
      invitedById: session.user.id,
    });

    const acceptUrl = `${getAppUrl()}/accept-invite?token=${rawToken}`;

    try {
      await sendTeamInviteEmail(email, {
        tenantName: tenant.name,
        inviterName: session.user.name || session.user.email,
        role,
        acceptUrl,
      });
    } catch (emailErr) {
      console.error("Sending team invite email failed:", emailErr);
      // Unlike signup's verification email, there's no separate "resend
      // invite" flow — the emailed link is the only way the invitee ever
      // sees the token, so a failed send is cleaned up rather than left
      // behind as a pending invite nobody can act on. Retrying the request
      // creates a fresh one.
      await tenantScoped(Invite, tenantId).deleteMany({ email, acceptedAt: null });
      return NextResponse.json({ error: t("api.invites.sendFailed") }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Creating invite failed:", err);
    return NextResponse.json({ error: t("api.invites.sendFailed") }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Tenant from "@/lib/models/Tenant";
import Invite from "@/lib/models/Invite";
import { findPendingInviteByToken } from "@/lib/invites";
import { getServerT } from "@/lib/i18n/server";

// Preview, not consumed — lets the accept-invite page show who invited them
// and to which company before asking for a name and password, without
// spending the token just by loading the page.
export async function GET(request) {
  const { t } = await getServerT();
  const token = new URL(request.url).searchParams.get("token");

  try {
    await connectDB();

    const invite = await findPendingInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: t("api.invites.linkInvalid") }, { status: 400 });
    }

    const tenant = await Tenant.findById(invite.tenantId).select("name").lean();
    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    return NextResponse.json({ email: invite.email, role: invite.role, tenantName: tenant.name });
  } catch (err) {
    console.error("Loading invite failed:", err);
    return NextResponse.json({ error: t("api.invites.linkInvalid") }, { status: 503 });
  }
}

// Public endpoint — the person accepting doesn't have an account yet. Joins
// them into the EXISTING tenant the invite names, unlike /api/signup which
// always creates a brand-new one.
export async function POST(request) {
  const { t } = await getServerT();
  const body = await request.json().catch(() => null);
  const { token, name, password } = body ?? {};

  if (!token || !name || !password) {
    return NextResponse.json({ error: t("api.common.allFieldsRequired") }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: t("api.common.passwordTooShort") }, { status: 400 });
  }

  try {
    await connectDB();

    const invite = await findPendingInviteByToken(token);
    if (!invite) {
      return NextResponse.json({ error: t("api.invites.linkInvalid") }, { status: 400 });
    }

    // Re-check even though invite creation already did — time has passed,
    // and the email is globally unique across every tenant.
    const existingUser = await User.findOne({ email: invite.email }).select("_id").lean();
    if (existingUser) {
      return NextResponse.json({ error: t("api.invites.alreadyHasAccount") }, { status: 409 });
    }

    const tenant = await Tenant.findById(invite.tenantId).select("slug").lean();
    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email: invite.email,
      passwordHash,
      name,
      tenantId: invite.tenantId,
      role: invite.role,
      // Clicking a link only they received in their own inbox already proves
      // the address — no separate verification email needed on top of it.
      emailVerified: new Date(),
    });

    await Invite.findByIdAndUpdate(invite._id, { acceptedAt: new Date() });

    return NextResponse.json({ ok: true, tenantSlug: tenant.slug });
  } catch (err) {
    console.error("Accepting invite failed:", err);
    return NextResponse.json({ error: t("api.invites.acceptFailed") }, { status: 503 });
  }
}

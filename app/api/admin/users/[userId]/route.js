import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { requireSuperAdmin } from "@/lib/adminSession";
import { isSuperAdmin } from "@/lib/roles";

/**
 * Suspend or restore one user account.
 *
 * A suspended user can't sign in at all (see auth.js). Heavier than blocking
 * a page — it cuts someone off from their own customer data — so it's a
 * deliberate separate action rather than a side effect of moderation.
 */
export async function PATCH(request, { params }) {
  const ctx = await requireSuperAdmin();
  if (ctx.res) return ctx.res;
  const { t, adminId } = ctx;

  const { userId } = await params;
  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
  }

  // An admin locking themselves out has no way back in through the product —
  // it would take a database edit to undo. Cheap to prevent, so prevent it.
  if (String(userId) === String(adminId)) {
    return NextResponse.json({ error: t("api.admin.cannotSuspendSelf") }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  const suspend = Boolean(body.suspended);
  const reason = String(body.reason || "").trim().slice(0, 500);

  try {
    await connectDB();

    const target = await User.findById(userId).select("platformRole email").lean();
    if (!target) {
      return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
    }

    // One platform admin cannot suspend another through the UI. If admins can
    // disable each other, a single compromised admin account can lock out
    // everyone able to stop it.
    if (isSuperAdmin(target.platformRole)) {
      return NextResponse.json({ error: t("api.admin.cannotSuspendAdmin") }, { status: 403 });
    }

    await User.updateOne(
      { _id: userId },
      {
        $set: suspend
          ? { suspendedAt: new Date(), suspendedReason: reason }
          : { suspendedAt: null, suspendedReason: "" },
      }
    );

    // Note: an already-issued JWT stays valid until it expires — NextAuth
    // sessions are stateless. The suspension takes effect at their next
    // sign-in. Blocking the tenant's page (which is checked per request, at
    // render) is the lever that acts immediately.
    return NextResponse.json({ ok: true, suspended: suspend });
  } catch (err) {
    console.error("Admin user suspension failed:", err);
    return NextResponse.json({ error: t("api.common.somethingWentWrong") }, { status: 503 });
  }
}

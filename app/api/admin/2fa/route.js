import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { getServerT } from "@/lib/i18n/server";
import { isSuperAdmin } from "@/lib/roles";
import {
  generateSecret,
  otpauthUri,
  verifyCode,
  generateRecoveryCodes,
} from "@/lib/twoFactor";

/**
 * 2FA enrolment for platform admins.
 *
 * Deliberately NOT behind requireSuperAdmin(): that guard requires 2FA to
 * already be enabled, so routing enrolment through it would be a deadlock —
 * a new admin could never turn on the thing they need in order to turn it on.
 * This route therefore does its own, narrower check: a live super admin, 2FA
 * state aside.
 *
 * POST  — start enrolment: mint a pending secret and return the otpauth URI.
 * PUT   — confirm enrolment with a working code; returns the recovery codes
 *         once, and never again.
 */

async function requireAdminForEnrolment() {
  const { t } = await getServerT();
  const session = await auth();

  if (!session?.user?.id || !isSuperAdmin(session.user.platformRole)) {
    // Same 404-not-403 reasoning as lib/adminSession.js.
    return { res: NextResponse.json({ error: t("api.common.notFound") }, { status: 404 }) };
  }

  await connectDB();
  const user = await User.findById(session.user.id).select(
    "email platformRole suspendedAt twoFactor.enabled +twoFactor.pendingSecret"
  );

  if (!user || user.suspendedAt || !isSuperAdmin(user.platformRole)) {
    return { res: NextResponse.json({ error: t("api.common.notFound") }, { status: 404 }) };
  }

  return { t, user };
}

export async function POST() {
  const ctx = await requireAdminForEnrolment();
  if (ctx.res) return ctx.res;
  const { t, user } = ctx;

  // Re-enrolling while already enabled would invalidate the working
  // authenticator the moment the new secret is confirmed. Requiring an
  // explicit disable first makes that a decision rather than an accident.
  if (user.twoFactor?.enabled) {
    return NextResponse.json({ error: t("api.admin.twoFactorAlreadyOn") }, { status: 400 });
  }

  const secret = generateSecret();
  // Written to `pendingSecret`, not `secret`: until a real code proves the
  // authenticator app actually holds it, this must not be able to lock anyone
  // out of anything.
  await User.updateOne({ _id: user._id }, { $set: { "twoFactor.pendingSecret": secret } });

  return NextResponse.json({
    ok: true,
    secret,
    // Both are returned so the client can render a QR code from the URI and
    // still offer the raw secret for manual entry — some authenticator apps
    // (and every desktop password manager) want typing it in.
    otpauthUri: otpauthUri({ secret, accountName: user.email }),
  });
}

export async function PUT(request) {
  const ctx = await requireAdminForEnrolment();
  if (ctx.res) return ctx.res;
  const { t, user } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const pending = user.twoFactor?.pendingSecret;

  if (!pending) {
    return NextResponse.json({ error: t("api.admin.twoFactorNoPending") }, { status: 400 });
  }

  const step = verifyCode(pending, body.code);
  if (!step) {
    return NextResponse.json({ error: t("api.admin.twoFactorBadCode") }, { status: 400 });
  }

  const { plain, hashed } = generateRecoveryCodes();

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        "twoFactor.enabled": true,
        "twoFactor.secret": pending,
        "twoFactor.pendingSecret": "",
        "twoFactor.recoveryCodes": hashed,
        "twoFactor.enabledAt": new Date(),
        // The confirming code counts as used — it can't also be the one that
        // signs them in seconds later.
        "twoFactor.lastUsedStep": step,
      },
    }
  );

  // The only time these are ever readable. Stored hashed, so a lost set can
  // only be replaced, never recovered.
  return NextResponse.json({ ok: true, recoveryCodes: plain });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { getServerT } from "@/lib/i18n/server";
import { isSuperAdmin } from "@/lib/roles";

/**
 * The guard every platform-admin route and page starts with.
 *
 * Three things make this stricter than requireTenantRole():
 *
 *  1. It re-reads the live User document rather than trusting the JWT. A JWT
 *     is only reissued at sign-in, so an admin whose access was revoked (or
 *     whose account was suspended) would otherwise keep it until their token
 *     expired. Platform-wide access is exactly the privilege where that lag
 *     is unacceptable — the extra read is worth it.
 *
 *  2. It requires 2FA to be actually enabled, not merely available. An admin
 *     account without a second factor can reach the enrolment endpoints and
 *     nothing else.
 *
 *  3. Failure is indistinguishable from "this route doesn't exist". See
 *     `notFoundResponse` below.
 *
 * On success returns `{ session, t, locale, adminId, admin }`; on failure
 * `{ res }`, which the caller returns as-is.
 */

/**
 * 404, not 403, for anyone who isn't an admin.
 *
 * A 403 confirms the route exists and that someone, somewhere, is allowed
 * through it — which is a map of the admin surface handed to anyone probing.
 * A 404 says nothing. Real admins never see this, so the loss of clarity
 * costs nothing.
 */
function notFoundResponse(t) {
  return NextResponse.json({ error: t("api.common.notFound") }, { status: 404 });
}

export async function requireSuperAdmin() {
  const { t, locale } = await getServerT();
  const session = await auth();

  // Cheap rejection first: no session, or a token that never claimed admin.
  if (!session?.user?.id || !isSuperAdmin(session.user.platformRole)) {
    return { res: notFoundResponse(t) };
  }

  await connectDB();
  const admin = await User.findById(session.user.id)
    .select("email name platformRole suspendedAt twoFactor.enabled")
    .lean();

  // The token said admin; the database is the one that decides.
  if (!admin || admin.suspendedAt || !isSuperAdmin(admin.platformRole)) {
    return { res: notFoundResponse(t) };
  }

  if (!admin.twoFactor?.enabled) {
    // Deliberately a distinct, honest error: this person IS an admin, so
    // there's nothing to conceal from them, and "not found" would send them
    // hunting for a broken link instead of to the enrolment screen.
    return {
      res: NextResponse.json(
        { error: t("api.admin.twoFactorRequired"), code: "TWO_FACTOR_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  return { session, t, locale, adminId: session.user.id, admin };
}

/**
 * Page-level variant for server components, which redirect or notFound()
 * rather than returning JSON. Returns `{ admin, t, locale }` on success and
 * `null` otherwise — the caller calls notFound() on null, so an unauthorized
 * visitor gets the ordinary 404 page and learns nothing.
 */
export async function getSuperAdminPageContext() {
  const { t, locale } = await getServerT();
  const session = await auth();

  if (!session?.user?.id || !isSuperAdmin(session.user.platformRole)) return null;

  await connectDB();
  const admin = await User.findById(session.user.id)
    .select("email name platformRole suspendedAt twoFactor.enabled")
    .lean();

  if (!admin || admin.suspendedAt || !isSuperAdmin(admin.platformRole)) return null;

  return {
    t,
    locale,
    admin: {
      id: session.user.id,
      email: admin.email,
      name: admin.name || "",
      twoFactorEnabled: Boolean(admin.twoFactor?.enabled),
    },
  };
}

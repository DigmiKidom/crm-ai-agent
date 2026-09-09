import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerT } from "@/lib/i18n/server";

export async function GET() {
  const { t } = await getServerT();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t("api.common.notAuthenticated") }, { status: 401 });
  }
  return NextResponse.json({
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug,
    role: session.user.role,
    email: session.user.email,
    // The login page routes on this: an unverified account goes to the
    // waiting room instead of the dashboard, so it never plays the intro
    // animation only to be bounced by proxy.js at the end of it.
    emailVerified: Boolean(session.user.emailVerified),
  });
}

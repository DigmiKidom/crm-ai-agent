import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail, getAppUrl } from "@/lib/email";
import { getServerT } from "@/lib/i18n/server";

export async function POST() {
  const { t, locale } = await getServerT();
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: t("api.common.notAuthenticated") }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: t("api.common.accountNotFound") }, { status: 404 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const rawToken = await createToken(user._id, "verify");
    const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${rawToken}`;
    await sendVerificationEmail(user.email, verifyUrl, locale);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resending verification email failed:", err);
    return NextResponse.json({ error: t("api.resendVerification.sendFailed") }, { status: 503 });
  }
}

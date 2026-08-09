import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { createToken } from "@/lib/tokens";
import { sendPasswordResetEmail, getAppUrl } from "@/lib/email";
import { getServerT } from "@/lib/i18n/server";

// Always returns a generic "ok" response regardless of whether the email
// exists — otherwise this endpoint becomes a way to enumerate registered
// accounts by email address.
export async function POST(request) {
  const { t, locale } = await getServerT();
  const { email } = (await request.json()) ?? {};
  const genericResponse = NextResponse.json({
    ok: true,
    message: t("api.forgotPassword.genericResponse"),
  });

  if (!email) return genericResponse;

  try {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return genericResponse;

    const rawToken = await createToken(user._id, "reset");
    const resetUrl = `${getAppUrl()}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl, locale);
    } catch (emailErr) {
      console.error("Sending password reset email failed:", emailErr);
      // Don't leak email-provider failures to the client — same generic
      // response either way, but log it so it's visible in server logs.
    }

    return genericResponse;
  } catch (err) {
    console.error("Forgot-password request failed:", err);
    return genericResponse;
  }
}

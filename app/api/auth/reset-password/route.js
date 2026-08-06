import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { consumeToken } from "@/lib/tokens";
import { getServerT } from "@/lib/i18n/server";

export async function POST(request) {
  const { t } = await getServerT();
  const { token, password } = (await request.json()) ?? {};

  if (!token || !password) {
    return NextResponse.json({ error: t("api.resetPassword.missingTokenOrPassword") }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: t("api.common.passwordTooShort") },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const userId = await consumeToken(token, "reset");
    if (!userId) {
      return NextResponse.json(
        { error: t("api.resetPassword.linkInvalid") },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(userId, { passwordHash });
    if (!user) {
      return NextResponse.json({ error: t("api.common.accountNotFound") }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resetting password failed:", err);
    return NextResponse.json({ error: t("api.resetPassword.resetFailed") }, { status: 503 });
  }
}

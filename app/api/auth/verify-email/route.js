import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { consumeToken } from "@/lib/tokens";
import { getAppUrl } from "@/lib/email";

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");

  try {
    await connectDB();
    const userId = token ? await consumeToken(token, "verify") : null;

    if (!userId) {
      return NextResponse.redirect(`${getAppUrl()}/login?verify=invalid`);
    }

    await User.findByIdAndUpdate(userId, { emailVerified: new Date() });
    return NextResponse.redirect(`${getAppUrl()}/login?verify=success`);
  } catch (err) {
    console.error("Verifying email failed:", err);
    return NextResponse.redirect(`${getAppUrl()}/login?verify=error`);
  }
}

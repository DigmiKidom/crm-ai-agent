import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { consumeToken } from "@/lib/tokens";

export async function POST(request) {
  const { token, password } = (await request.json()) ?? {};

  if (!token || !password) {
    return NextResponse.json({ error: "Missing token or password." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const userId = await consumeToken(token, "reset");
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(userId, { passwordHash });
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resetting password failed:", err);
    return NextResponse.json({ error: "Could not reset password. Try again." }, { status: 503 });
  }
}

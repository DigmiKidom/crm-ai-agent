import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

/**
 * "Has this account's address been confirmed yet?"
 *
 * Read straight from the User document rather than from the session, which is
 * the whole point: the verification link is opened by a mail client that may
 * be on another device entirely, so the JWT held by the tab asking this
 * question is exactly the thing that can't be trusted to know.
 *
 * Answers only about the caller's own account, so it leaks nothing — the
 * session already determines whose row is read.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ verified: false }, { status: 401 });
  }

  // Already confirmed in this token: no reason to touch the database.
  if (session.user.emailVerified) {
    return NextResponse.json({ verified: true });
  }

  try {
    await connectDB();
    const user = await User.findById(session.user.id).select("emailVerified").lean();
    return NextResponse.json({ verified: Boolean(user?.emailVerified) });
  } catch (err) {
    console.error("Reading verification status failed:", err);
    // Not an error the caller can act on — the waiting page just polls again.
    return NextResponse.json({ verified: false }, { status: 503 });
  }
}

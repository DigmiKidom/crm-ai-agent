import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug,
    role: session.user.role,
    email: session.user.email,
  });
}

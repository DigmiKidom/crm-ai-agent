import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Protects the CRM dashboard: requires a logged-in session, and blocks a
// user from one tenant loading another tenant's dashboard by editing the
// URL's tenantSlug segment.
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const match = nextUrl.pathname.match(/^\/t\/([^/]+)/);
  if (!match) return NextResponse.next();

  const requestedSlug = match[1];

  if (!session?.user) {
    const loginUrl = new URL("/login", nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.tenantSlug !== requestedSlug) {
    // Logged in, but this isn't their tenant — send them to their own dashboard
    // rather than exposing someone else's data.
    const ownUrl = new URL(`/t/${session.user.tenantSlug}`, nextUrl.origin);
    return NextResponse.redirect(ownUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/t/:path*"],
};

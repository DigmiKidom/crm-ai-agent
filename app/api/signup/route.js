import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import User from "@/lib/models/User";
import Pipeline from "@/lib/models/Pipeline";
import { slugify } from "@/lib/slugify";

// MVP signup: creates a brand-new tenant and makes the signing-up user its
// owner. Joining an existing tenant via an invite link is a Phase 2 addition.
export async function POST(request) {
  const body = await request.json();
  const { companyName, name, email, password } = body ?? {};

  if (!companyName || !name || !email || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    let baseSlug = slugify(companyName) || "company";
    let slug = baseSlug;
    let suffix = 1;
    while (await Tenant.findOne({ slug })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const tenant = await Tenant.create({ name: companyName, slug });
    await Pipeline.create({ tenantId: tenant._id });

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      tenantId: tenant._id,
      role: "owner",
    });

    return NextResponse.json({ ok: true, tenantSlug: tenant.slug });
  } catch (err) {
    // Most likely cause here is the database being unreachable (bad URI,
    // Atlas Network Access not allowing this IP, DNS issues resolving the
    // mongodb+srv record, etc.) — surface a clean JSON error either way
    // instead of letting Next.js return an HTML error page for a 500.
    console.error("Signup failed:", err);
    return NextResponse.json(
      { error: "Could not reach the database. Check your MONGODB_URI and Atlas Network Access, then try again." },
      { status: 503 }
    );
  }
}

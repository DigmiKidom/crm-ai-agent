import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Tenant from "@/lib/models/Tenant";
import User from "@/lib/models/User";
import Pipeline from "@/lib/models/Pipeline";
import { slugify } from "@/lib/slugify";
import { createToken } from "@/lib/tokens";
import { sendVerificationEmail, getAppUrl } from "@/lib/email";
import { getServerT } from "@/lib/i18n/server";

// MVP signup: creates a brand-new tenant and makes the signing-up user its
// owner. Joining an existing tenant via an invite link is a Phase 2 addition.
export async function POST(request) {
  const { t } = await getServerT();
  const body = await request.json();
  const { companyName, name, email, password } = body ?? {};

  if (!companyName || !name || !email || !password) {
    return NextResponse.json({ error: t("api.common.allFieldsRequired") }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: t("api.common.passwordTooShort") },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: t("api.signup.emailExists") }, { status: 409 });
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
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      tenantId: tenant._id,
      role: "owner",
    });

    // Best-effort: a broken email provider shouldn't block account creation.
    try {
      const rawToken = await createToken(user._id, "verify");
      const verifyUrl = `${getAppUrl()}/api/auth/verify-email?token=${rawToken}`;
      await sendVerificationEmail(user.email, verifyUrl);
    } catch (emailErr) {
      console.error("Sending verification email failed:", emailErr);
    }

    return NextResponse.json({ ok: true, tenantSlug: tenant.slug });
  } catch (err) {
    // Most likely cause here is the database being unreachable (bad URI,
    // Atlas Network Access not allowing this IP, DNS issues resolving the
    // mongodb+srv record, etc.) — surface a clean JSON error either way
    // instead of letting Next.js return an HTML error page for a 500.
    console.error("Signup failed:", err);
    return NextResponse.json(
      { error: t("api.signup.dbUnreachable") },
      { status: 503 }
    );
  }
}

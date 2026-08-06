import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Resume, {
  MAX_EDUCATION,
  MAX_EXPERIENCE,
  MAX_SKILLS,
  MAX_SUMMARY,
  MAX_BULLETS,
} from "@/lib/models/Resume";
import { isRtlLanguage } from "@/lib/i18n/languages";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Every field is rebuilt from scratch rather than spread from the request body.
// A client can't add keys the schema doesn't know about, and the caps are
// enforced here as well as in the model — this route is the trust boundary.
function sanitize(body) {
  return {
    title: str(body.title, 120) || "My CV",
    fullName: str(body.fullName, 120),
    headline: str(body.headline, 160),
    email: str(body.email, 160),
    phone: str(body.phone, 40),
    location: str(body.location, 120),
    website: str(body.website, 200),
    linkedin: str(body.linkedin, 200),
    summary: str(body.summary, MAX_SUMMARY),

    experience: (Array.isArray(body.experience) ? body.experience : [])
      .slice(0, MAX_EXPERIENCE)
      .map((e) => ({
        role: str(e?.role, 120),
        company: str(e?.company, 120),
        location: str(e?.location, 120),
        startDate: str(e?.startDate, 40),
        // A role marked "current" must not also carry an end date, or the
        // rendered CV reads "2021 – 2023 – Present".
        endDate: e?.current ? "" : str(e?.endDate, 40),
        current: Boolean(e?.current),
        bullets: (Array.isArray(e?.bullets) ? e.bullets : [])
          .slice(0, MAX_BULLETS)
          .map((b) => str(b, 400))
          .filter(Boolean),
      })),

    education: (Array.isArray(body.education) ? body.education : [])
      .slice(0, MAX_EDUCATION)
      .map((e) => ({
        institution: str(e?.institution, 160),
        degree: str(e?.degree, 120),
        field: str(e?.field, 120),
        startDate: str(e?.startDate, 40),
        endDate: str(e?.endDate, 40),
        note: str(e?.note, 300),
      })),

    skills: (Array.isArray(body.skills) ? body.skills : [])
      .slice(0, MAX_SKILLS)
      .map((s) => str(s, 60))
      .filter(Boolean),
  };
}

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  try {
    await connectDB();
    const resume = await tenantScoped(Resume, tenantId)
      .findOne({ userId: session.user.id })
      .lean();

    return NextResponse.json({ resume: resume ? JSON.parse(JSON.stringify(resume)) : null });
  } catch (err) {
    console.error("Loading CV failed:", err);
    return NextResponse.json({ error: t("api.resume.loadFailed") }, { status: 503 });
  }
}

export async function PUT(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { session, t, tenantId } = ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("api.common.expectedJsonBody") }, { status: 400 });
  }

  const doc = sanitize(body ?? {});

  const code = String(body?.language?.code || "en").toLowerCase().split(/[-_]/)[0];
  doc.language = { code, dir: isRtlLanguage(code) ? "rtl" : "ltr" };
  doc.isPublic = Boolean(body?.isPublic);

  try {
    await connectDB();
    const resume = await tenantScoped(Resume, tenantId)
      .findOneAndUpdate({ userId: session.user.id }, { $set: doc }, {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      })
      .lean();

    return NextResponse.json({ ok: true, resume: JSON.parse(JSON.stringify(resume)) });
  } catch (err) {
    console.error("Saving CV failed:", err);
    return NextResponse.json({ error: t("api.resume.saveFailed") }, { status: 503 });
  }
}

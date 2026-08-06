import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getServerT } from "@/lib/i18n/server";
import { connectDB } from "@/lib/db";
import Resume from "@/lib/models/Resume";
import User from "@/lib/models/User";
import ResumeBuilder from "@/components/resume/ResumeBuilder";
import styles from "@/components/dashboard.module.css";

const BLANK = {
  title: "My CV",
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  website: "",
  linkedin: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  language: { code: "en", dir: "ltr" },
};

export default async function CvPage({ params }) {
  const { t, locale } = await getServerT();
  const { tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.tenantSlug !== tenantSlug) redirect(`/t/${session.user.tenantSlug}`);

  await connectDB();
  const [existing, user] = await Promise.all([
    Resume.findOne({ tenantId: session.user.tenantId, userId: session.user.id }).lean(),
    User.findById(session.user.id).select("name email title phone").lean(),
  ]);

  // A first-time CV is seeded from the profile the user already filled in —
  // retyping their own name and email is friction for no benefit. Once the CV
  // exists it's independent, since a CV often carries a personal address.
  const initialResume = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
        ...BLANK,
        fullName: user?.name || "",
        headline: user?.title || "",
        email: user?.email || "",
        phone: user?.phone || "",
        language: { code: locale, dir: locale === "he" ? "rtl" : "ltr" },
      };

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("cv.title")}</h1>
      <p style={{ color: "var(--muted)", marginTop: -16, marginBottom: 24, fontSize: "0.9rem" }}>
        {t("cv.subtitle")}
      </p>

      <ResumeBuilder initialResume={initialResume} />
    </div>
  );
}

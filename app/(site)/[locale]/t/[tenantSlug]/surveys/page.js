import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Survey from "@/lib/models/Survey";
import { getRouteT } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n/routing";
import { tenantScoped } from "@/lib/tenantScope";
import SurveyManager from "@/components/plugins/SurveyManager";
import styles from "@/components/dashboard.module.css";

export const metadata = { title: "Feedback & surveys" };

export default async function SurveysPage({ params }) {
  const { t } = await getRouteT(params);
  const { locale, tenantSlug } = await params;

  const session = await auth();
  if (!session?.user) redirect(localePath(locale, "/login"));
  if (session.user.tenantSlug !== tenantSlug) {
    redirect(localePath(locale, `/t/${session.user.tenantSlug}`));
  }

  await connectDB();
  const surveys = await tenantScoped(Survey, session.user.tenantId)
    .find()
    .sort({ createdAt: -1 })
    .limit(100)
    .select("title intro questions open responseCount ratingSum ratingCount createdAt")
    .lean();

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("plugins.surveys.label")}</h1>
      <p className={styles.sectionHint}>{t("plugins.surveys.description")}</p>
      <SurveyManager
        initialSurveys={JSON.parse(JSON.stringify(surveys))}
        // Resolved on the server so the shareable link is right in the markup
        // rather than appearing after hydration — someone copying it the moment
        // the page loads gets the real URL, not an empty origin.
        appUrl={process.env.APP_URL || ""}
      />
    </div>
  );
}

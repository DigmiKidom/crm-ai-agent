import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Survey from "@/lib/models/Survey";
import Tenant from "@/lib/models/Tenant";
import { resolveLandingCopy } from "@/lib/landingCopy";
import { DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/translate";
import SurveyForm from "./SurveyForm";
import styles from "./page.module.css";

// Not ISR-cached, unlike /pages/[tenantSlug]. A survey's open/closed state is
// the difference between collecting answers and turning customers away, and a
// business that closes a form expects the link to say so immediately rather
// than up to a revalidation window later.
export const dynamic = "force-dynamic";

async function loadSurvey(surveyId) {
  if (!mongoose.isValidObjectId(surveyId)) return null;
  await connectDB();
  return Survey.findById(surveyId).select("tenantId title intro questions open").lean();
}

export async function generateMetadata({ params }) {
  const { surveyId } = await params;
  try {
    const survey = await loadSurvey(surveyId);
    if (!survey) return {};
    return {
      title: { absolute: survey.title },
      // A feedback link is sent to named customers, not published. Keeping it
      // out of the index means an answer someone gave doesn't turn up in a
      // search for their name.
      robots: { index: false, follow: false },
    };
  } catch {
    return {};
  }
}

/**
 * The page a customer lands on from a link the business sent them.
 *
 * Unauthenticated and outside the localised tree: the URL has to survive being
 * pasted into WhatsApp, so it stays /s/<id> in one form (see
 * UNLOCALIZED_PREFIXES). Direction and language come from the *tenant's*
 * content language — the same rule the landing pages follow. A Hebrew business
 * surveying Hebrew customers gets a right-to-left form regardless of the
 * browser that opens it.
 */
export default async function PublicSurveyPage({ params }) {
  const { surveyId } = await params;

  const survey = await loadSurvey(surveyId);
  if (!survey) notFound();

  const tenant = await Tenant.findById(survey.tenantId)
    .select("name landingPage.language theme.primaryColor")
    .lean();

  const copy = resolveLandingCopy(tenant ?? {});
  const language = copy.language;

  // The public strings are resolved here rather than through a provider: this
  // page has no LocaleProvider above it, and the visitor's own UI language is
  // not the axis that matters — the tenant's content language is.
  const dict = getDictionary(normalizeLocale(language.code) || DEFAULT_LOCALE);
  const labels = {
    submit: dict.surveys?.public?.submit ?? "Send",
    sending: dict.surveys?.public?.sending ?? "Sending…",
    thanks: dict.surveys?.public?.thanks ?? "Thank you for your feedback.",
    closed: dict.surveys?.public?.closed ?? "This survey is closed.",
    namePlaceholder: dict.surveys?.public?.namePlaceholder ?? "Your name (optional)",
    required: dict.surveys?.public?.required ?? "Please answer the required questions.",
    failed: dict.surveys?.public?.failed ?? "Something went wrong. Please try again.",
    ratingLabel: dict.surveys?.public?.ratingLabel ?? "Rate {n} out of 5",
  };

  return (
    <div
      className={styles.page}
      dir={language.dir}
      lang={language.code}
      style={tenant?.theme?.primaryColor ? { "--survey-accent": tenant.theme.primaryColor } : undefined}
    >
      <main className={styles.card}>
        {tenant?.name && <p className={styles.brand}>{tenant.name}</p>}
        <h1 className={styles.title}>{survey.title}</h1>
        {survey.intro && <p className={styles.intro}>{survey.intro}</p>}

        {survey.open ? (
          <SurveyForm
            surveyId={surveyId}
            questions={survey.questions}
            labels={labels}
          />
        ) : (
          <p className={styles.closed}>{labels.closed}</p>
        )}
      </main>
    </div>
  );
}

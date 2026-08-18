import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Survey, { MAX_RESPONDENT_NAME, SurveyResponse } from "@/lib/models/Survey";
import { str } from "@/lib/apiInput";
import { collectAnswers } from "@/lib/surveys";
import { getServerT } from "@/lib/i18n/server";

// The one write path in the whole feedback tool that an anonymous visitor can
// reach — the customer answering a link the business sent them.
//
// Deliberately not under /api/surveys/[id]: everything there is authored by a
// signed-in tenant and guarded by requireTenantSession, and a public POST
// sitting inside that folder is exactly the kind of thing a later refactor
// "tidies" into the same guard, or worse, out of it. A separate path makes the
// trust boundary visible in the URL.
//
// Rate limited by proxy.js (the `surveyResponse` bucket).
//
// The respondent's own locale decides the language of any error here, so this
// uses getServerT() rather than a tenant session — the visitor is not a member
// of the tenant and has no session to read a locale from.
export async function POST(request, { params }) {
  const { t } = await getServerT();
  const { surveyId } = await params;

  if (!mongoose.isValidObjectId(surveyId)) {
    return NextResponse.json({ error: t("api.surveys.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};

  try {
    await connectDB();

    // Not tenant-scoped, because there is no tenant in context — the survey id
    // *is* the credential, and tenantId is read off the survey rather than
    // accepted from the request so a submission can never be filed against a
    // business that didn't publish this form.
    const survey = await Survey.findById(surveyId)
      .select("tenantId questions open")
      .lean();

    if (!survey) {
      return NextResponse.json({ error: t("api.surveys.notFound") }, { status: 404 });
    }
    if (!survey.open) {
      return NextResponse.json({ error: t("api.surveys.closed") }, { status: 409 });
    }

    const { answers, missingRequired } = collectAnswers(survey.questions, body.answers);
    if (missingRequired.length) {
      return NextResponse.json({ error: t("api.surveys.answerRequired") }, { status: 400 });
    }
    if (!answers.length) {
      return NextResponse.json({ error: t("api.surveys.emptyResponse") }, { status: 400 });
    }

    await SurveyResponse.create({
      tenantId: survey.tenantId,
      surveyId,
      respondentName: str(body.respondentName, MAX_RESPONDENT_NAME),
      answers,
    });

    // Running totals for the list view, incremented in the same request that
    // created the response. $inc rather than a recount so two submissions
    // arriving together both land — see the note on Survey.responseCount.
    const ratings = answers.filter((a) => typeof a.rating === "number");
    await Survey.updateOne(
      { _id: surveyId },
      {
        $inc: {
          responseCount: 1,
          ratingCount: ratings.length,
          ratingSum: ratings.reduce((sum, a) => sum + a.rating, 0),
        },
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Recording a survey response failed:", err);
    return NextResponse.json({ error: t("api.surveys.submitFailed") }, { status: 503 });
  }
}

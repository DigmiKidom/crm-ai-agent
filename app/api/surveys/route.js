import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Survey, { MAX_QUESTION_LABEL, MAX_SURVEY_TITLE } from "@/lib/models/Survey";
import { str } from "@/lib/apiInput";
import { normalizeQuestions } from "@/lib/surveys";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const PAGE_SIZE = 100;

export async function GET() {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();
    const surveys = await tenantScoped(Survey, tenantId)
      .find()
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .select("title intro questions open responseCount ratingSum ratingCount createdAt")
      .lean();

    return NextResponse.json({ ok: true, surveys });
  } catch (err) {
    console.error("Listing surveys failed:", err);
    return NextResponse.json({ error: t("api.surveys.loadFailed") }, { status: 503 });
  }
}

export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId, session } = ctx;

  const body = (await request.json().catch(() => null)) ?? {};
  const title = str(body.title, MAX_SURVEY_TITLE);
  if (!title) {
    return NextResponse.json({ error: t("api.surveys.titleRequired") }, { status: 400 });
  }

  const questions = normalizeQuestions(body.questions);
  if (!questions) {
    return NextResponse.json({ error: t("api.surveys.questionsRequired") }, { status: 400 });
  }

  try {
    await connectDB();
    const survey = await tenantScoped(Survey, tenantId).create({
      title,
      intro: str(body.intro, MAX_QUESTION_LABEL),
      questions,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      ok: true,
      survey: {
        _id: survey._id.toString(),
        title: survey.title,
        intro: survey.intro,
        questions: survey.questions,
        open: survey.open,
        responseCount: 0,
        ratingSum: 0,
        ratingCount: 0,
        createdAt: survey.createdAt,
      },
    });
  } catch (err) {
    console.error("Creating a survey failed:", err);
    return NextResponse.json({ error: t("api.surveys.saveFailed") }, { status: 503 });
  }
}

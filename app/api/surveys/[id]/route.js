import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Survey, { MAX_QUESTION_LABEL, MAX_SURVEY_TITLE, SurveyResponse } from "@/lib/models/Survey";
import { str } from "@/lib/apiInput";
import { normalizeQuestions } from "@/lib/surveys";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

export async function PATCH(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.surveys.notFound") }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) ?? {};

  try {
    await connectDB();
    const existing = await tenantScoped(Survey, tenantId)
      .findOne({ _id: id })
      .select("questions")
      .lean();
    if (!existing) {
      return NextResponse.json({ error: t("api.surveys.notFound") }, { status: 404 });
    }

    const update = {};
    if (body.title !== undefined) {
      const title = str(body.title, MAX_SURVEY_TITLE);
      if (!title) {
        return NextResponse.json({ error: t("api.surveys.titleRequired") }, { status: 400 });
      }
      update.title = title;
    }
    if (body.intro !== undefined) update.intro = str(body.intro, MAX_QUESTION_LABEL);
    if (body.open !== undefined) update.open = body.open === true;

    if (body.questions !== undefined) {
      // Existing keys are passed in so an edit re-uses them — see
      // normalizeQuestions. Rewording a question must not orphan its answers.
      const questions = normalizeQuestions(body.questions, existing.questions);
      if (!questions) {
        return NextResponse.json({ error: t("api.surveys.questionsRequired") }, { status: 400 });
      }
      update.questions = questions;
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: t("api.common.nothingToUpdate") }, { status: 400 });
    }

    const survey = await tenantScoped(Survey, tenantId)
      .findOneAndUpdate({ _id: id }, { $set: update }, { new: true })
      .select("title intro questions open responseCount ratingSum ratingCount createdAt")
      .lean();

    return NextResponse.json({ ok: true, survey });
  } catch (err) {
    console.error("Updating a survey failed:", err);
    return NextResponse.json({ error: t("api.surveys.saveFailed") }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.surveys.notFound") }, { status: 404 });
  }

  try {
    await connectDB();
    const deleted = await tenantScoped(Survey, tenantId).findOneAndDelete({ _id: id });
    if (!deleted) {
      return NextResponse.json({ error: t("api.surveys.notFound") }, { status: 404 });
    }

    // The answers go with the survey. They are only meaningful next to the
    // questions that produced them, and leaving them behind would mean a
    // tenant who deleted a survey still had its responses in the database.
    await tenantScoped(SurveyResponse, tenantId).deleteMany({ surveyId: id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Deleting a survey failed:", err);
    return NextResponse.json({ error: t("api.surveys.deleteFailed") }, { status: 503 });
  }
}

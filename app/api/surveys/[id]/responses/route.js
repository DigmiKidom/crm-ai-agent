import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Survey, { SurveyResponse } from "@/lib/models/Survey";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

const PAGE_SIZE = 200;

export async function GET(request, { params }) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: t("api.surveys.notFound") }, { status: 404 });
  }

  try {
    await connectDB();
    // Checked through the tenant scope before reading responses, so an id from
    // another tenant returns "not found" rather than that tenant's answers.
    const survey = await tenantScoped(Survey, tenantId)
      .findOne({ _id: id })
      .select("title questions")
      .lean();
    if (!survey) {
      return NextResponse.json({ error: t("api.surveys.notFound") }, { status: 404 });
    }

    const responses = await tenantScoped(SurveyResponse, tenantId)
      .find({ surveyId: id })
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .select("respondentName answers createdAt")
      .lean();

    return NextResponse.json({ ok: true, survey, responses });
  } catch (err) {
    console.error("Listing survey responses failed:", err);
    return NextResponse.json({ error: t("api.surveys.loadFailed") }, { status: 503 });
  }
}

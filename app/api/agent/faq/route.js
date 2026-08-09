import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant, { MAX_FAQ_ITEMS } from "@/lib/models/Tenant";
import { generateFaq } from "@/lib/agent";
import { requireTenantRole } from "@/lib/tenantSession";
import { MAX_FAQ_QUESTION, MAX_FAQ_ANSWER } from "@/lib/faq";

/**
 * Drafts an FAQ for the landing page editor's "Write these for me" button.
 *
 * Returns the entries rather than saving them: the editor drops them into
 * its own state so the owner reads, edits, and then saves them with the rest
 * of the page. Nothing an AI wrote reaches a real visitor without the owner
 * pressing Save on it.
 */
export async function POST() {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  try {
    await connectDB();

    const tenant = await Tenant.findById(tenantId)
      .select("name industry landingPage.headline landingPage.subheadline landingPage.features landingPage.language")
      .lean();

    if (!tenant) {
      return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
    }

    const faq = await generateFaq({
      companyName: tenant.name,
      industry: tenant.industry,
      headline: tenant.landingPage?.headline,
      subheadline: tenant.landingPage?.subheadline,
      features: tenant.landingPage?.features || [],
      // The page's own content language, not the owner's dashboard locale —
      // an owner reading the dashboard in English may well run a Hebrew page.
      languageName: tenant.landingPage?.language?.name,
      count: 5,
    });

    const cleaned = faq
      .filter((item) => item?.question?.trim() && item?.answer?.trim())
      .slice(0, MAX_FAQ_ITEMS)
      .map((item) => ({
        question: item.question.trim().slice(0, MAX_FAQ_QUESTION),
        answer: item.answer.trim().slice(0, MAX_FAQ_ANSWER),
      }));

    if (!cleaned.length) {
      return NextResponse.json({ error: t("api.agentFaq.failed") }, { status: 502 });
    }

    return NextResponse.json({ ok: true, faq: cleaned });
  } catch (err) {
    console.error("FAQ generation failed:", err);
    const message = /GOOGLE_API_KEY/.test(err.message || "")
      ? t("api.agentGenerate.notConfigured")
      : t("api.agentFaq.failed");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

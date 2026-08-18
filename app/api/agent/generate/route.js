import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant, { MAX_FEATURES, MAX_FAQ_ITEMS } from "@/lib/models/Tenant";
import Pipeline from "@/lib/models/Pipeline";
import AgentSession from "@/lib/models/AgentSession";
import { generateSiteConfig } from "@/lib/agent";
import { getTemplate } from "@/lib/templates";
import { isValidIconKey } from "@/lib/landingIcons";
import { AUTO_LANGUAGE, resolveContentLanguage } from "@/lib/i18n/languages";
import { describeCompanySize, normalizeCompanySize } from "@/lib/companySize";
import { normalizeAgentPreferences } from "@/lib/agentPreferences";
import {
  AI_DESIGN_DAILY_LIMIT,
  readAiDesignUsage,
  secondsUntilReset,
  utcDayKey,
} from "@/lib/aiUsage";
import { requireTenantRole } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

/**
 * Claims one of the tenant's three daily generations, atomically.
 *
 * The check and the increment have to be a single operation. Two people in the
 * same business pressing Generate at once would both pass a read-then-write
 * check while the stored count was 2, and the tenant would spend four — this is
 * a paid model call, so "usually right" is the wrong standard.
 *
 * The filter admits the request when either the stored counter belongs to an
 * earlier day (so it is about to be reset) or it is still under the limit; the
 * pipeline then resets-to-1 or increments accordingly. A day rollover and a
 * normal increment are therefore the same round trip, and no separate reset
 * write can be lost between them.
 *
 * Returns the updated tenant, or null when the tenant doesn't exist *or* the
 * quota is gone — the caller tells those apart with a follow-up read, which is
 * the uncommon path.
 */
async function claimDesignGeneration(tenantId, at = new Date()) {
  const dayStart = new Date(`${utcDayKey(at)}T00:00:00.000Z`);

  return Tenant.findOneAndUpdate(
    {
      _id: tenantId,
      $or: [
        { "aiDesignGenerations.lastResetDate": { $ne: dayStart } },
        { "aiDesignGenerations.count": { $lt: AI_DESIGN_DAILY_LIMIT } },
      ],
    },
    [
      {
        $set: {
          "aiDesignGenerations.count": {
            $cond: [
              { $eq: ["$aiDesignGenerations.lastResetDate", dayStart] },
              { $add: [{ $ifNull: ["$aiDesignGenerations.count", 0] }, 1] },
              1,
            ],
          },
          "aiDesignGenerations.lastResetDate": dayStart,
        },
      },
    ],
    { new: true }
  );
}

/**
 * Hands a claimed generation back when the model call fails.
 *
 * Charging someone for a design they never received is the kind of thing that
 * turns one bad Gemini response into a support ticket. Guarded on the same day
 * and a positive count so a refund arriving after midnight can't push the new
 * day's counter negative, and best-effort: a failed refund must not replace the
 * real error with a database one.
 */
async function refundDesignGeneration(tenantId, at = new Date()) {
  const dayStart = new Date(`${utcDayKey(at)}T00:00:00.000Z`);
  try {
    await Tenant.updateOne(
      {
        _id: tenantId,
        "aiDesignGenerations.lastResetDate": dayStart,
        "aiDesignGenerations.count": { $gt: 0 },
      },
      { $inc: { "aiDesignGenerations.count": -1 } }
    );
  } catch (err) {
    console.error("Refunding an AI design generation failed:", err);
  }
}

export async function POST(request) {
  const ctx = await requireTenantRole("admin");
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  const body = await request.json();
  const {
    industry,
    companySize,
    leadDefinition,
    tone,
    personality,
    style,
    targetAudience,
    technology,
    brandColor,
    language,
  } = body ?? {};

  if (!industry || !leadDefinition) {
    return NextResponse.json(
      { error: t("api.agentGenerate.missingRequiredFields") },
      { status: 400 }
    );
  }

  // Same trust boundary as every other tenant-writable preference: narrow to
  // known values rather than trusting the request shape, since this is what
  // both the AI prompt and the persisted Tenant document end up built from.
  const preferences = normalizeAgentPreferences({ tone, personality, style, targetAudience, technology });

  let claimed = false;

  try {
    await connectDB();

    // Claimed before the model call, not after. A generation that takes twenty
    // seconds must not leave a twenty-second window in which the quota reads as
    // available; the refund below covers the case where the call then fails.
    const tenant = await claimDesignGeneration(tenantId);

    if (!tenant) {
      const existing = await Tenant.findById(tenantId).select("aiDesignGenerations").lean();
      if (!existing) {
        return NextResponse.json({ error: t("api.common.tenantNotFound") }, { status: 404 });
      }

      const usage = readAiDesignUsage(existing.aiDesignGenerations);
      const retryAfter = secondsUntilReset();
      return NextResponse.json(
        {
          error: t("api.agentGenerate.dailyLimitReached", { limit: usage.limit }),
          used: usage.used,
          remaining: 0,
          limit: usage.limit,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    claimed = true;

    const config = await generateSiteConfig({
      companyName: tenant.name,
      industry,
      // Legacy numeric values from older sessions map onto a tier rather than
      // reaching the prompt as "51-200".
      companySize: describeCompanySize(companySize),
      leadDefinition,
      ...preferences,
      language: language || AUTO_LANGUAGE,
    });

    // Dotted paths, not a whole `landingPage` object — re-running AI setup
    // should refresh the copy without wiping the tenant's uploaded background
    // photos, overlay strength, or logo preference.
    const update = {
      industry,
      companySize: normalizeCompanySize(companySize),
      agentPreferences: preferences,
      templateId: config.templateId,
      "landingPage.headline": config.headline,
      "landingPage.subheadline": config.subheadline,
      "landingPage.ctaLabel": config.ctaLabel,
      "landingPage.features": (config.features || []).slice(0, MAX_FEATURES).map((f) => ({
        title: f.title,
        description: (f.description || "").slice(0, 300),
        icon: isValidIconKey(f.icon) ? f.icon : "",
      })),
      // What the agent reports it actually wrote in — which is not necessarily
      // what was requested, and is the value the public page must trust.
      "landingPage.language": resolveContentLanguage(config.languageCode, config.languageName),
      "landingPage.galleryHeading": config.galleryHeading || "",
      "landingPage.contactHeading": config.contactHeading || "",
      "landingPage.faqHeading": config.faqHeading || "",
    };

    // Only written when the agent actually produced usable entries — a
    // partial or empty response must not wipe an FAQ the tenant has already
    // edited by hand.
    const faq = (config.faq || [])
      .filter((item) => item?.question?.trim() && item?.answer?.trim())
      .slice(0, MAX_FAQ_ITEMS)
      .map((item) => ({
        question: item.question.trim().slice(0, 160),
        answer: item.answer.trim().slice(0, 600),
      }));
    if (faq.length) update["landingPage.faq"] = faq;

    // Written field-by-field so a partial response can't blank out labels the
    // tenant already had. lib/landingCopy.js fills any remaining gaps.
    const formLabels = config.formLabels ?? {};
    for (const key of ["name", "email", "phone", "message", "sending", "success", "error"]) {
      if (typeof formLabels[key] === "string" && formLabels[key].trim()) {
        update[`landingPage.formLabels.${key}`] = formLabels[key].trim();
      }
    }
    if (brandColor) update["theme.primaryColor"] = brandColor;

    const updatedTenant = await Tenant.findByIdAndUpdate(tenantId, { $set: update }, { new: true });

    await tenantScoped(Pipeline, tenantId).findOneAndUpdate(
      {},
      { stages: config.pipelineStages.map((s) => s.toLowerCase()) },
      { upsert: true }
    );

    await tenantScoped(AgentSession, tenantId).create({
      input: {
        industry,
        companySize,
        leadDefinition,
        ...preferences,
        brandColor,
        language: language || AUTO_LANGUAGE,
      },
      output: config,
    });

    // Straight off the document the claim already returned, so the builder can
    // update its counter without a second request that could read a different
    // number than the one this generation just spent.
    const usage = readAiDesignUsage(tenant.aiDesignGenerations);

    return NextResponse.json({
      ok: true,
      tenantSlug: updatedTenant.slug,
      templateId: config.templateId,
      templateName: getTemplate(config.templateId).name,
      language: update["landingPage.language"],
      used: usage.used,
      remaining: usage.remaining,
      limit: usage.limit,
    });
  } catch (err) {
    console.error("AI agent generation failed:", err);
    if (claimed) await refundDesignGeneration(tenantId);
    const message = /GOOGLE_API_KEY/.test(err.message || "")
      ? t("api.agentGenerate.notConfigured")
      : t("api.agentGenerate.failed");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

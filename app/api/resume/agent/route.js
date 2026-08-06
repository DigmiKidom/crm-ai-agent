import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AgentSession from "@/lib/models/AgentSession";
import { runResumeAgent, RESUME_ACTIONS } from "@/lib/resumeAgent";
import { MAX_SUMMARY } from "@/lib/resumeLimits";
import { requireTenantSession } from "@/lib/tenantSession";
import { tenantScoped } from "@/lib/tenantScope";

/**
 * Runs the CV agent against whatever is currently in the editor.
 *
 * Deliberately stateless: it takes the draft from the request and returns a
 * suggestion, rather than reading and writing the stored document. That keeps
 * "polish" a preview the user can reject — nothing is persisted until they
 * press Save, which matches the explicit-save model used everywhere else.
 */
export async function POST(request) {
  const ctx = await requireTenantSession();
  if (ctx.res) return ctx.res;
  const { t, tenantId } = ctx;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: t("api.common.expectedJsonBody") }, { status: 400 });
  }

  const action = RESUME_ACTIONS.includes(body?.action) ? body.action : "polish";
  const resume = body?.resume ?? {};

  const hasExperience = Array.isArray(resume.experience) && resume.experience.length > 0;
  const hasSkills = Array.isArray(resume.skills) && resume.skills.length > 0;
  if (!hasExperience && !hasSkills && !resume.summary) {
    return NextResponse.json(
      { error: t("api.resumeAgent.nothingToWorkWith") },
      { status: 400 }
    );
  }

  try {
    const result = await runResumeAgent({
      resume,
      action,
      language: body?.language || "auto",
    });

    // Clamp what comes back. The agent is instructed not to add roles, but the
    // UI merges by index, so a longer array than we sent would silently attach
    // bullets to a role that doesn't exist.
    const suggestion = {
      summary: typeof result.summary === "string" ? result.summary.slice(0, MAX_SUMMARY) : "",
      language: result.language,
    };
    if (action === "summarize") {
      suggestion.headline =
        typeof result.headline === "string" ? result.headline.slice(0, 160) : "";
    } else {
      const incoming = Array.isArray(result.experience) ? result.experience : [];
      suggestion.experience = (resume.experience || []).map((role, i) => ({
        bullets: Array.isArray(incoming[i]?.bullets)
          ? incoming[i].bullets.map((b) => String(b).slice(0, 400)).filter(Boolean)
          : role.bullets || [],
      }));
    }

    // Logged for the same reason every landing-page generation is: so a bad
    // result can be inspected later rather than guessed at.
    try {
      await connectDB();
      await tenantScoped(AgentSession, tenantId).create({
        input: { kind: "resume", action, resume },
        output: suggestion,
      });
    } catch (logErr) {
      // Never fail the request because the audit write failed.
      console.error("Logging resume agent session failed:", logErr);
    }

    return NextResponse.json({ ok: true, action, suggestion });
  } catch (err) {
    console.error("Resume agent failed:", err);
    const message = /GOOGLE_API_KEY/.test(err.message || "")
      ? t("api.resumeAgent.notConfigured")
      : t("api.resumeAgent.failed");
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

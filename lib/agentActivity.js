import AgentSession from "@/lib/models/AgentSession";
import Lead from "@/lib/models/Lead";

// The three agent surfaces that write to AgentSession, and how to tell them
// apart: the two that shipped later tag their own `input.kind`; the
// original site-generation agent (lib/agent.js) predates that convention
// and never got backfilled, so its sessions are simply the ones with no
// `kind` at all — not a bug, just the oldest writer in this collection.
function normalizeKind(input) {
  if (input?.kind === "leadReply") return "lead_reply";
  if (input?.kind === "resume") return "resume";
  return "site_generation";
}

/**
 * The most recent AI agent actions across every surface (site generation,
 * lead-reply drafting, CV polish/summarize), normalized into one feed for
 * the Analytics screen's activity panel. `t` builds the display line here
 * (server-side, request-scoped locale) rather than leaving the client to
 * re-derive it from raw AgentSession documents.
 */
export async function getRecentAgentActivity({ tenantId, t, limit = 8 }) {
  const sessions = await AgentSession.find({ tenantId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (!sessions.length) return [];

  const leadIds = [
    ...new Set(
      sessions
        .filter((s) => normalizeKind(s.input) === "lead_reply" && s.input?.leadId)
        .map((s) => s.input.leadId.toString())
    ),
  ];

  const leads = leadIds.length
    ? await Lead.find({ _id: { $in: leadIds }, tenantId }).select("name").lean()
    : [];
  const leadNames = new Map(leads.map((l) => [l._id.toString(), l.name]));

  return sessions.map((session) => {
    const kind = normalizeKind(session.input);
    let summary;

    if (kind === "lead_reply") {
      const leadName = leadNames.get(session.input?.leadId?.toString()) || t("analytics.activity.unknownLead");
      summary = t("analytics.activity.leadReply", { name: leadName });
    } else if (kind === "resume") {
      summary = t(
        session.input?.action === "summarize" ? "analytics.activity.resumeSummarize" : "analytics.activity.resumePolish"
      );
    } else {
      summary = t("analytics.activity.siteGeneration", { industry: session.input?.industry || "" });
    }

    return {
      id: session._id.toString(),
      kind,
      summary,
      createdAt: session.createdAt,
    };
  });
}

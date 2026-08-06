import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { isRtlLanguage } from "@/lib/i18n/languages";

// Same model and forced function-calling pattern as lib/agent.js and
// lib/resumeAgent.js — the agent's only job is filling this schema, never
// writing free prose we then have to parse or trust as-is.
const MODEL = "gemini-flash-latest";

let client;
function getClient() {
  if (!client) {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("Missing GOOGLE_API_KEY environment variable");
    }
    client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  }
  return client;
}

function buildDeclaration() {
  return {
    name: "draft_lead_reply",
    description:
      "Draft a short first-response message to a new CRM lead, ready for the business owner to review, edit, and send themselves.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "Email subject line for the reply, under 10 words.",
        },
        body: {
          type: "string",
          description:
            "The message body: 3-6 short sentences. Warm and specific to what this lead actually said, not a generic template. Maximum 1200 characters.",
        },
        languageCode: {
          type: "string",
          description:
            "BCP-47 code of the language you wrote in — 'he' for Hebrew, 'en' for English, and so on. Must describe what you actually wrote.",
        },
      },
      required: ["subject", "body", "languageCode"],
    },
  };
}

/**
 * Drafts a first-response reply for a single lead. Stateless and read-only —
 * nothing is sent or persisted here, matching the "AI proposes, human
 * commits" pattern used everywhere else: the caller shows this as an
 * editable suggestion the owner can copy, edit, or discard.
 */
export async function draftLeadReply({ lead, tenant }) {
  const ai = getClient();
  const declaration = buildDeclaration();

  // The reply must land in the same language the visitor used to submit the
  // form, i.e. the landing page's own content language — not the dashboard
  // owner's UI locale, which has no bearing on what the lead can read.
  const language = tenant.landingPage?.language;
  const languageInstruction = language?.code
    ? `LANGUAGE: Write in ${language.name || language.code} (BCP-47 "${language.code}") — the same language this business's landing page and lead form are written in, since that's the language this person used to reach out. This is not negotiable, even though these instructions are in English.`
    : "LANGUAGE: Write in English.";

  const preferences = tenant.agentPreferences || {};
  const voiceLine = [
    preferences.tone ? `Tone: ${preferences.tone}.` : "",
    preferences.personality?.length ? `Brand personality: ${preferences.personality.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const customFieldLines = (lead.customFields || [])
    .filter((f) => f.value)
    .map((f) => `${f.label || f.key}: ${f.value}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Draft a first-response message from "${tenant.name}" to someone who just submitted their contact form.

Lead's name: ${lead.name}
${lead.email ? `Email: ${lead.email}\n` : ""}${lead.phone ? `Phone: ${lead.phone}\n` : ""}${
      lead.message
        ? `Their message:\n${lead.message}`
        : "They didn't leave a message — just their contact details."
    }
${customFieldLines ? `\nOther details they gave:\n${customFieldLines}` : ""}

Business: ${tenant.name}${tenant.industry ? `, industry: ${tenant.industry}` : ""}.
${voiceLine}

RULES — these matter more than style:
- Reply to what they actually said. If they asked a specific question or described a specific need, address it directly. If they left no message, keep it a short, warm acknowledgment that someone will follow up — not a generic sales pitch.
- Never invent facts: no pricing, availability, timelines, or specifics that aren't given above.
- Sign off as "${tenant.name}" or "The ${tenant.name} team" — never invent a person's name.
- This is a first response, not a full sales pitch — keep it short.
- ${languageInstruction}`,
    config: {
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: [declaration.name],
        },
      },
      tools: [{ functionDeclarations: [declaration] }],
    },
  });

  const call = response.functionCalls?.[0];
  if (!call?.args) throw new Error("Agent did not return structured output.");

  const args = call.args;
  const code = String(args.languageCode || "en").toLowerCase().split(/[-_]/)[0];

  return {
    subject: String(args.subject || "").slice(0, 150),
    body: String(args.body || "").slice(0, 1200),
    language: { code, dir: isRtlLanguage(code) ? "rtl" : "ltr" },
  };
}

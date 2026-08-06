import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { isRtlLanguage } from "@/lib/i18n/languages";

// Same model and same forced-function-call pattern as lib/agent.js: the model's
// only job is to fill a fixed schema, never to write prose we then have to
// parse. That's what makes the output safe to write straight into the document.
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

export const RESUME_ACTIONS = ["polish", "summarize"];

function buildDeclaration(action) {
  const languageFields = {
    languageCode: {
      type: "string",
      description:
        "BCP-47 code of the language you wrote in — 'he' for Hebrew, 'en' for English. This must describe what you actually wrote.",
    },
  };

  if (action === "summarize") {
    return {
      name: "write_candidate_summary",
      description:
        "Write a professional summary paragraph for a candidate, based on their experience, education and skills.",
      parametersJsonSchema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description:
              "A 2-4 sentence professional summary written in the first person without using 'I' (CV convention, e.g. 'Backend engineer with eight years…'). Concrete and specific to this candidate — no generic filler like 'hard-working team player'. Maximum 700 characters.",
          },
          headline: {
            type: "string",
            description:
              "A short professional headline for under the candidate's name, e.g. 'Senior Backend Engineer'. Maximum 60 characters.",
          },
          ...languageFields,
        },
        required: ["summary", "headline", "languageCode"],
      },
    };
  }

  return {
    name: "polish_resume_content",
    description:
      "Rewrite a candidate's CV bullet points and summary to be sharper and more results-focused, without inventing facts.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "The polished professional summary. If the candidate supplied one, improve it; keep every fact they stated. Maximum 700 characters.",
        },
        experience: {
          type: "array",
          description:
            "One entry per role, in the SAME ORDER as the input. Do not add, remove or reorder roles.",
          items: {
            type: "object",
            properties: {
              bullets: {
                type: "array",
                description:
                  "The polished bullet points for this role. Start each with a strong past-tense verb, lead with the outcome, and keep any numbers the candidate gave. Never invent metrics, employers, dates or technologies that weren't in the input. Same number of bullets as the input, or fewer if two said the same thing.",
                items: { type: "string" },
                maxItems: 8,
              },
            },
            required: ["bullets"],
          },
        },
        ...languageFields,
      },
      required: ["summary", "experience", "languageCode"],
    },
  };
}

/** Compact text view of the CV — the model doesn't need our schema shape. */
function describeResume(resume) {
  const lines = [];
  if (resume.fullName) lines.push(`Name: ${resume.fullName}`);
  if (resume.headline) lines.push(`Current headline: ${resume.headline}`);
  if (resume.summary) lines.push(`\nExisting summary:\n${resume.summary}`);

  if (resume.experience?.length) {
    lines.push("\nExperience:");
    resume.experience.forEach((role, i) => {
      const when = [role.startDate, role.current ? "present" : role.endDate]
        .filter(Boolean)
        .join(" – ");
      lines.push(
        `${i + 1}. ${role.role || "(role not given)"} at ${role.company || "(company not given)"}${
          when ? ` (${when})` : ""
        }`
      );
      (role.bullets || []).filter(Boolean).forEach((b) => lines.push(`   - ${b}`));
    });
  }

  if (resume.education?.length) {
    lines.push("\nEducation:");
    resume.education.forEach((e) => {
      lines.push(
        `- ${[e.degree, e.field].filter(Boolean).join(", ")} — ${e.institution || "(institution not given)"}`
      );
    });
  }

  if (resume.skills?.length) lines.push(`\nSkills: ${resume.skills.join(", ")}`);
  return lines.join("\n");
}

/**
 * Polishes or summarizes a CV.
 *
 * The hard constraint throughout is that the agent may only rewrite what the
 * candidate wrote. A CV that invents an employer or a metric isn't "optimised",
 * it's a liability for the person sending it — so the prompt says so explicitly
 * and the schema gives the model nowhere to add a role.
 */
export async function runResumeAgent({ resume, action = "polish", language = "auto" }) {
  if (!RESUME_ACTIONS.includes(action)) {
    throw new Error(`Unknown resume action: ${action}`);
  }

  const ai = getClient();
  const declaration = buildDeclaration(action);

  const languageInstruction =
    language && language !== "auto"
      ? `Write your output in the language with BCP-47 code "${language}". This is not negotiable, even though these instructions are in English.`
      : "Write your output in the SAME language the candidate wrote their CV in. If their entries are in Hebrew, write Hebrew. These instructions are in English, which tells you nothing about what language to write in.";

  const task =
    action === "summarize"
      ? "Write a professional summary and a short headline for this candidate."
      : "Polish this candidate's summary and the bullet points under each role.";

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `${task}

${describeResume(resume)}

RULES — these matter more than style:
- Never invent facts. No employers, job titles, dates, technologies, team sizes, percentages or metrics that are not in the text above.
- If a bullet has no measurable outcome, sharpen the wording rather than adding a number.
- Keep it specific to this person. Avoid CV filler: "results-driven", "team player", "passionate about", "proven track record".
- Prefer active voice and concrete verbs. One idea per bullet.
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
    ...args,
    language: { code, dir: isRtlLanguage(code) ? "rtl" : "ltr" },
  };
}

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { templateIds, templateList } from "@/lib/templates";
import { ICON_KEYS } from "@/lib/landingIcons";
import { AUTO_LANGUAGE, CONTENT_LANGUAGES } from "@/lib/i18n/languages";

// Using the "-latest" alias rather than a dated model id (e.g. "gemini-2.5-flash")
// so this doesn't silently 404 again the next time Google sunsets a model
// version for new API keys.
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

// Forcing a function call (rather than asking for JSON in prose) is what
// keeps this reliable — the agent's only job is filling in this schema and
// picking from the available templates, not designing a page layout from
// scratch.
function buildSiteConfigDeclaration() {
  const templates = templateList();
  const templateDescriptions = templates.map((t) => `- ${t.id}: ${t.description}`).join("\n");

  return {
    name: "generate_site_config",
    description:
      "Generate landing page copy and a CRM pipeline tailored to a specific company, based on their industry and preferences, and pick the best-fitting landing page template.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        templateId: {
          type: "string",
          enum: templateIds(),
          description: `Pick the single best-fitting template for this business:\n${templateDescriptions}`,
        },
        headline: {
          type: "string",
          description: "Short, punchy hero headline for the landing page, under 12 words.",
        },
        subheadline: {
          type: "string",
          description: "One supporting sentence shown under the headline.",
        },
        ctaLabel: {
          type: "string",
          description: "Call-to-action button text, 2-4 words (e.g. 'Book a demo').",
        },
        features: {
          type: "array",
          description:
            "Exactly 3 feature/benefit cards relevant to this specific business. The landing page renders at most 3.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: {
                type: "string",
                description: "One or two sentences, 300 characters maximum.",
              },
              icon: {
                type: "string",
                description:
                  "Icon key that best matches this benefit — e.g. 'coin' for pricing, 'thumbsUp' for honesty, 'clock' for speed, 'shield' for guarantees.",
                enum: ICON_KEYS,
              },
            },
            required: ["title", "description", "icon"],
          },
          minItems: 3,
          maxItems: 3,
        },
        pipelineStages: {
          type: "array",
          description:
            "4 to 6 short, lowercase stage names for this business's lead pipeline, in the order a lead moves through them. Write them in the SAME language as the landing page copy.",
          items: { type: "string" },
          minItems: 4,
          maxItems: 6,
        },
        languageCode: {
          type: "string",
          description:
            "The BCP-47 code of the language you wrote ALL of the above in — 'he' for Hebrew, 'en' for English, 'ar' for Arabic, and so on. This must describe what you actually wrote, not what you were asked for.",
        },
        languageName: {
          type: "string",
          description: "The English name of that language, e.g. 'Hebrew'.",
        },
        formLabels: {
          type: "object",
          description:
            "Field labels and status messages for the lead-capture form shown on the landing page. These are read by real visitors, so they MUST be in the same language as the rest of the copy — a Hebrew page with an English form is a bug.",
          properties: {
            name: { type: "string", description: "Label for the visitor's name field, e.g. 'Name'." },
            email: { type: "string", description: "Label for the email field." },
            phone: {
              type: "string",
              description: "Label for the optional phone field, including how this language marks a field optional, e.g. 'Phone (optional)'.",
            },
            message: {
              type: "string",
              description: "Label for the optional free-text message field, marked optional the same way.",
            },
            sending: { type: "string", description: "Button text while submitting, e.g. 'Sending…'." },
            success: {
              type: "string",
              description: "Confirmation shown after a successful submit, e.g. \'Thanks — we\'ll be in touch shortly.\' Match the brand tone.",
            },
            error: {
              type: "string",
              description: "Message shown if the submission fails, e.g. 'Something went wrong. Please try again.'",
            },
          },
          required: ["name", "email", "phone", "message", "sending", "success", "error"],
        },
        galleryHeading: {
          type: "string",
          description:
            "Heading for the photo gallery section, e.g. 'Gallery' or 'Our work'. Same language as the rest of the copy.",
        },
        contactHeading: {
          type: "string",
          description:
            "Heading above the contact form, e.g. 'Get in touch'. Same language as the rest of the copy.",
        },
      },
      required: [
        "templateId",
        "headline",
        "subheadline",
        "ctaLabel",
        "features",
        "pipelineStages",
        "languageCode",
        "languageName",
        "formLabels",
        "galleryHeading",
        "contactHeading",
      ],
    },
  };
}

export async function generateSiteConfig({
  companyName,
  industry,
  companySize,
  leadDefinition,
  tone,
  personality = [],
  style = "modern",
  targetAudience = [],
  technology = "balanced",
  language = AUTO_LANGUAGE,
}) {
  const ai = getClient();
  const declaration = buildSiteConfigDeclaration();

  const personalityLine = personality.length
    ? `Brand personality traits to reflect in the writing: ${personality.join(", ")}.`
    : "";
  const audienceLine = targetAudience.length
    ? `Who they sell to: ${targetAudience.join(", ")}.`
    : "";

  // Two modes. Explicit: the owner picked a language, so it's an instruction.
  // Auto: infer it from the language they actually typed their answers in —
  // someone describing their business in Hebrew wants a Hebrew page, and
  // saying so beats hoping the model picks it up implicitly.
  const chosen = CONTENT_LANGUAGES.find((l) => l.code === language);
  const languageInstruction = chosen
    ? `LANGUAGE: Write every single string in ${chosen.name} (${chosen.nativeName}). This is not negotiable, even though these instructions are in English.`
    : `LANGUAGE: Detect the language the owner wrote their answers in above (industry, lead definition, company name) and write every single string in THAT language. If their answers are in Hebrew, the entire page must be in Hebrew. If they are mixed or ambiguous, use English. These instructions are in English, which tells you nothing about what language to write in.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Generate landing page copy, pick a template, and design a CRM lead pipeline for a company signing up for a CRM SaaS product.

Company name: ${companyName}
Industry: ${industry}
Company size: ${companySize}
What counts as a "lead" for them: ${leadDefinition}
Desired tone: ${tone}
Desired visual style: ${style}
Technology positioning: ${technology} (how tech-forward vs. traditional/high-touch the business wants to come across)
${personalityLine}
${audienceLine}

${languageInstruction}

Everything you produce is read by that business's own visitors: the headline, the subheadline, the CTA, the feature cards, the pipeline stage names, the section headings, AND the lead form's field labels and status messages. All of it must be in one consistent language. A page whose copy is in one language but whose form labels are in another is broken — do not do that. Then report which language you used in languageCode/languageName.

Write copy that's specifically relevant to their industry and business — avoid generic SaaS marketing language. Let the tone, visual style, personality traits, and audience all shape the word choice (e.g. a "traditional, high-touch" business selling to enterprises should read very differently from a "cutting-edge" one selling to individual consumers). The pipeline stages should reflect how a lead actually moves through their specific sales process.`,
    config: {
      toolConfig: {
        functionCallingConfig: {
          // Force it to call the function rather than replying in prose.
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: [declaration.name],
        },
      },
      tools: [{ functionDeclarations: [declaration] }],
    },
  });

  const call = response.functionCalls?.[0];
  if (!call?.args) {
    throw new Error("Agent did not return structured output.");
  }
  return call.args;
}

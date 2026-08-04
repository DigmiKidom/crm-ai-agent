import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { templateIds, templateList } from "@/lib/templates";

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
          description: "3 to 4 feature/benefit blurbs relevant to this specific business.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "description"],
          },
          minItems: 3,
          maxItems: 4,
        },
        pipelineStages: {
          type: "array",
          description:
            "4 to 6 short, lowercase stage names for this business's lead pipeline, in the order a lead moves through them (e.g. ['new','contacted','qualified','won','lost']).",
          items: { type: "string" },
          minItems: 4,
          maxItems: 6,
        },
      },
      required: ["templateId", "headline", "subheadline", "ctaLabel", "features", "pipelineStages"],
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
}) {
  const ai = getClient();
  const declaration = buildSiteConfigDeclaration();

  const personalityLine = personality.length
    ? `Brand personality traits to reflect in the writing: ${personality.join(", ")}.`
    : "";
  const audienceLine = targetAudience.length
    ? `Who they sell to: ${targetAudience.join(", ")}.`
    : "";

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

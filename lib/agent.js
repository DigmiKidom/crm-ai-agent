import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY environment variable");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Forcing a tool call (rather than asking for JSON in prose) is what keeps
// this reliable — the agent's only job is filling in this schema, not
// designing a page layout or writing free-form code.
const SITE_CONFIG_TOOL = {
  name: "generate_site_config",
  description:
    "Generate landing page copy and a CRM pipeline tailored to a specific company, based on their industry and preferences.",
  input_schema: {
    type: "object",
    properties: {
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
    required: ["headline", "subheadline", "ctaLabel", "features", "pipelineStages"],
  },
};

export async function generateSiteConfig({
  companyName,
  industry,
  companySize,
  leadDefinition,
  tone,
}) {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [SITE_CONFIG_TOOL],
    tool_choice: { type: "tool", name: "generate_site_config" },
    messages: [
      {
        role: "user",
        content: `Generate landing page copy and a CRM lead pipeline for a company signing up for a CRM SaaS product.

Company name: ${companyName}
Industry: ${industry}
Company size: ${companySize}
What counts as a "lead" for them: ${leadDefinition}
Desired tone: ${tone}

Write copy that's specifically relevant to their industry and business — avoid generic SaaS marketing language. The pipeline stages should reflect how a lead actually moves through their specific sales process.`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("Agent did not return structured output.");
  }
  return toolUse.input;
}

// Company size tiers.
//
// These replaced numeric headcount ranges ("1-10", "11-50", …). The old values
// asked the owner a question they had to translate into a self-description;
// these ask the question directly, and a one-person consultancy and a 9-person
// agency want very different copy despite both being "1-10".
//
// The `value` strings are stored on the Tenant and sent to the AI agent, so
// they must stay stable regardless of UI language — only labels are translated.
export const COMPANY_SIZES = [
  {
    value: "solo",
    // The English label, duplicated from the dictionary on purpose: this module
    // is imported by an API route that has no translator, and the AI prompt is
    // written in English regardless of the user's UI language. Without it the
    // agent was receiving the raw slug — "growth-smb (11-200 people)".
    label: "One-Man Show / Freelancer",
    // Roughly how the tier maps to headcount. Passed to the agent as context so
    // it isn't guessing what "Growth SMB" means.
    headcount: "1 person",
  },
  { value: "micro-startup", label: "Micro Startup", headcount: "2-10 people" },
  { value: "growth-smb", label: "Growth SMB", headcount: "11-200 people" },
  { value: "enterprise", label: "Enterprise", headcount: "200+ people" },
];

export const COMPANY_SIZE_VALUES = COMPANY_SIZES.map((s) => s.value);
export const DEFAULT_COMPANY_SIZE = "solo";

/**
 * Maps a stored value — including the legacy numeric ranges — to a tier.
 *
 * Tenants onboarded before this shipped have "1-10"/"11-50"/"51-200"/"200+" in
 * their AgentSession history, and re-running AI Setup shouldn't crash or
 * silently reset their answer.
 */
const LEGACY = {
  "1-10": "micro-startup",
  "11-50": "growth-smb",
  "51-200": "growth-smb",
  "200+": "enterprise",
};

export function normalizeCompanySize(value) {
  if (COMPANY_SIZE_VALUES.includes(value)) return value;
  return LEGACY[value] ?? DEFAULT_COMPANY_SIZE;
}

/**
 * The phrase handed to the agent, e.g. "Growth SMB (11-200 people)".
 *
 * `t` is optional and only used for UI surfaces. The prompt itself is English,
 * so omitting it correctly yields the English label rather than the slug.
 */
export function describeCompanySize(value, t) {
  const tier = normalizeCompanySize(value);
  const meta = COMPANY_SIZES.find((s) => s.value === tier);
  const label = t ? t(`companySize.${tier}`) : meta.label;
  return `${label} (${meta.headcount})`;
}

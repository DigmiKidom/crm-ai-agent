// Brand-voice preferences collected at onboarding and fed to the site-generation
// agent (lib/agent.js). Previously these lived only as page-local constants in
// components/OnboardingForm.js and were logged to AgentSession but never
// persisted to the Tenant itself — a rerun of "AI Setup" always started from
// scratch, and there was no way to nudge tone/personality/etc. without a full
// regenerate. This module is the shared source of truth (mirrors lib/companySize.js):
// imported by the Tenant schema (enum validation), the onboarding form (options +
// prefill), and Settings' Brand Voice section (options + prefill).
//
// Values are stable English slugs sent to the AI agent and stored on the
// Tenant — only their UI labels are translated (see the `onboarding.*Opt.*`
// dictionary keys, reused by Settings). Values already read as natural
// English words, unlike lib/companySize.js's terser tiers, so no separate
// "describe for the prompt" helper is needed here.

export const TONE_VALUES = ["professional", "friendly", "bold", "minimal"];
export const PERSONALITY_VALUES = [
  "innovative", "trustworthy", "approachable", "premium",
  "down-to-earth", "playful", "expert-led",
];
export const STYLE_VALUES = ["minimal", "bold", "classic", "playful", "elegant", "modern"];
export const AUDIENCE_VALUES = ["consumers", "small-business", "enterprise", "local-community", "b2b"];
export const TECH_VALUES = ["traditional", "balanced", "cutting-edge"];

export const DEFAULT_AGENT_PREFERENCES = {
  tone: "professional",
  personality: [],
  style: "modern",
  targetAudience: [],
  technology: "balanced",
};

/**
 * Defensively narrows a client-supplied preferences payload to known values —
 * the same trust boundary every other tenant-writable field gets (see
 * normalizeFormFields, resolveContentLanguage). Unknown single-select values
 * fall back to the default; unknown multi-select entries are just dropped
 * rather than rejecting the whole request, since e.g. deselecting a bad
 * personality tag shouldn't require throwing away the good ones.
 */
export function normalizeAgentPreferences(input) {
  const value = input || {};
  return {
    tone: TONE_VALUES.includes(value.tone) ? value.tone : DEFAULT_AGENT_PREFERENCES.tone,
    personality: Array.isArray(value.personality)
      ? [...new Set(value.personality.filter((v) => PERSONALITY_VALUES.includes(v)))]
      : [],
    style: STYLE_VALUES.includes(value.style) ? value.style : DEFAULT_AGENT_PREFERENCES.style,
    targetAudience: Array.isArray(value.targetAudience)
      ? [...new Set(value.targetAudience.filter((v) => AUDIENCE_VALUES.includes(v)))]
      : [],
    technology: TECH_VALUES.includes(value.technology)
      ? value.technology
      : DEFAULT_AGENT_PREFERENCES.technology,
  };
}

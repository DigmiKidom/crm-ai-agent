import mongoose from "mongoose";
import { FIELD_TYPES, MAX_FORM_FIELDS as FORM_FIELDS_LIMIT } from "@/lib/formFields";
import {
  TONE_VALUES,
  PERSONALITY_VALUES,
  STYLE_VALUES,
  AUDIENCE_VALUES,
  TECH_VALUES,
  DEFAULT_AGENT_PREFERENCES,
} from "@/lib/agentPreferences";

// Landing page limits are enforced in three places on purpose: the editor UI
// caps what you can add, the API rejects overflow, and these constants are the
// single source of truth both import.
export const MAX_FEATURES = 3;
export const MAX_BACKGROUNDS = 3;
export const MAX_GALLERY = 6;
export const GALLERY_COLUMNS = [2, 3, 4];
// Re-exported from lib/formFields.js (the model-free source of truth — see
// that file) so callers that already import the Tenant model don't need a
// second import just for this constant.
export { MAX_FORM_FIELDS } from "@/lib/formFields";

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    industry: { type: String, default: "" },

    // Descriptive tier ("solo" | "micro-startup" | "growth-smb" | "enterprise")
    // rather than a headcount range — see lib/companySize.js. Persisted so the
    // AI Setup form can prefill it on a re-run instead of resetting to default.
    companySize: {
      type: String,
      enum: ["solo", "micro-startup", "growth-smb", "enterprise"],
      default: "solo",
    },
    templateId: { type: String, default: "default" },

    // Brand-voice inputs from onboarding — previously only ever logged to
    // AgentSession, never persisted, so a rerun of "AI Setup" always started
    // from scratch and there was no way to tune them without a full
    // regenerate. See lib/agentPreferences.js (shared with the onboarding
    // form and Settings' Brand Voice section) for what each value means.
    agentPreferences: {
      tone: { type: String, enum: TONE_VALUES, default: DEFAULT_AGENT_PREFERENCES.tone },
      personality: { type: [{ type: String, enum: PERSONALITY_VALUES }], default: [] },
      style: { type: String, enum: STYLE_VALUES, default: DEFAULT_AGENT_PREFERENCES.style },
      targetAudience: { type: [{ type: String, enum: AUDIENCE_VALUES }], default: [] },
      technology: { type: String, enum: TECH_VALUES, default: DEFAULT_AGENT_PREFERENCES.technology },
    },

    // Company profile — surfaced in Settings and reused on the landing page
    // footer and contact block.
    profile: {
      legalName: { type: String, default: "" },
      tagline: { type: String, default: "" },
      about: { type: String, default: "" },
      contactEmail: { type: String, default: "" },
      contactPhone: { type: String, default: "" },
      addressLine: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      website: { type: String, default: "" },
      social: {
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        x: { type: String, default: "" },
      },
    },

    // Points at a Media document; the image itself never lives on this doc.
    logoMediaId: { type: mongoose.Schema.Types.ObjectId, ref: "Media", default: null },

    theme: {
      primaryColor: { type: String, default: "#2563eb" },
      accentColor: { type: String, default: "#111827" },
      fontFamily: { type: String, default: "system-ui, sans-serif" },
    },

    landingPage: {
      headline: { type: String, default: "Grow your business with us" },
      // A/B testing, headline only (see lib/abTest.js + components/templates/
      // shared/ABHeadline.js). Empty means "no test running" — the public
      // page always renders `headline` alone, unchanged from before this
      // shipped. Once set, a visitor is assigned "a" or "b" client-side and
      // stays on it via a cookie; Lead.landingVariant records which one
      // produced each submission.
      headlineVariantB: { type: String, default: "" },
      subheadline: { type: String, default: "Tell your visitors why they should reach out." },
      ctaLabel: { type: String, default: "Get in touch" },
      showLogo: { type: Boolean, default: true },
      // Off by default — pulls the tenant's own team (name, title, avatar,
      // and a link to their public CV where one exists) onto the public
      // page instead of the "About us" copy being written from scratch a
      // second time. See components/templates/shared/TeamSection.js.
      showTeamSection: { type: Boolean, default: false },

      // The language this page's copy is written in — a property of the
      // content, not of whoever is viewing it. Drives dir/lang on the public
      // page so a Hebrew page renders RTL for every visitor, including one
      // whose own dashboard is in English.
      //
      // `dir` is stored rather than derived so a language the agent picked
      // that we don't have in CONTENT_LANGUAGES still renders correctly.
      language: {
        code: { type: String, default: "en" },
        name: { type: String, default: "English" },
        dir: { type: String, enum: ["ltr", "rtl"], default: "ltr" },
      },

      // Visitor-facing chrome, generated alongside the copy. These live here
      // (rather than as hardcoded React strings) specifically so they can
      // never disagree with the language of the copy around them.
      formLabels: {
        name: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        message: { type: String, default: "" },
        sending: { type: String, default: "" },
        success: { type: String, default: "" },
        error: { type: String, default: "" },
      },
      galleryHeading: { type: String, default: "" },
      contactHeading: { type: String, default: "" },

      // The visitor-facing lead form, field by field. Empty means "not
      // configured yet" — resolveLandingCopy() in lib/landingCopy.js falls
      // back to the four core fields (name/email/phone/message) built from
      // formLabels above, so pre-migration tenants keep working unchanged.
      // See lib/formFields.js for what a field can be and why "type" needs
      // the extra nesting below (a field literally named "type" collides
      // with Mongoose's own shorthand otherwise).
      formFields: {
        type: [
          {
            key: { type: String, required: true },
            crmField: {
              type: String,
              enum: ["name", "email", "phone", "message", "custom"],
              default: "custom",
            },
            label: { type: String, default: "" },
            type: { type: String, enum: FIELD_TYPES, default: "text" },
            required: { type: Boolean, default: false },
          },
        ],
        default: [],
        validate: {
          validator: (v) => v.length <= FORM_FIELDS_LIMIT,
          message: `At most ${FORM_FIELDS_LIMIT} form fields.`,
        },
      },
      // Up to 3 hero images. One renders static; more than one cross-fades.
      backgroundMediaIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
        default: [],
        validate: {
          validator: (v) => v.length <= MAX_BACKGROUNDS,
          message: `At most ${MAX_BACKGROUNDS} background images.`,
        },
      },
      backgroundOverlay: { type: Number, default: 0.55, min: 0, max: 1 },
      features: {
        type: [
          {
            title: String,
            description: String,
            // Key into lib/landingIcons.js — "" means render no icon.
            icon: { type: String, default: "" },
            // Optional accenting, set per card. Both default off so existing
            // cards keep the plain look they have today.
            topStrip: { type: Boolean, default: false },
            border: { type: Boolean, default: false },
            // Which brand colour the strip/border uses. Only ever one of the
            // tenant's two theme colours — never a free-form hex, so a card
            // can't drift away from the brand palette.
            accentColor: { type: String, enum: ["primary", "accent"], default: "primary" },
          },
        ],
        default: [],
        validate: {
          validator: (v) => v.length <= MAX_FEATURES,
          message: `At most ${MAX_FEATURES} feature cards.`,
        },
      },

      // Up to 6 photos rendered as a grid further down the page — separate
      // from the hero backgrounds above, meant for a portfolio/work gallery.
      galleryMediaIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
        default: [],
        validate: {
          validator: (v) => v.length <= MAX_GALLERY,
          message: `At most ${MAX_GALLERY} gallery photos.`,
        },
      },
      // How many columns the gallery grid renders on desktop; it always
      // collapses to fewer on narrow screens regardless of this setting.
      galleryColumns: { type: Number, enum: GALLERY_COLUMNS, default: 3 },
    },

    notifications: {
      emailOnNewLead: { type: Boolean, default: false },
    },

    plan: { type: String, enum: ["free", "pro"], default: "free" },
  },
  { timestamps: true }
);

export default mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);

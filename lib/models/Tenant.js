import mongoose from "mongoose";
import { FIELD_TYPES, MAX_FORM_FIELDS as FORM_FIELDS_LIMIT } from "@/lib/formFields";
import { MAX_FAQ_ITEMS as FAQ_LIMIT } from "@/lib/faq";
import { DEFAULT_OUTREACH_TEMPLATE } from "@/lib/socialLinks";
import { FOLLOW_UP_INTERVALS, DEFAULT_FOLLOW_UP_INTERVAL } from "@/lib/followUp";
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
// Re-exported for the same reason as MAX_FORM_FIELDS below — see lib/faq.js.
export { MAX_FAQ_ITEMS } from "@/lib/faq";
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

    // Formats every dealValue figure on Analytics (Intl.NumberFormat, not a
    // conversion rate — this doesn't convert amounts between currencies,
    // it just labels them correctly for a tenant who isn't pricing in USD).
    currency: { type: String, default: "USD" },

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
      // Every platform the landing page can link to — see lib/socialLinks.js
      // for the canonical list, how a bare handle becomes a full URL, and how
      // the WhatsApp deep link is built.
      //
      // Edited in two places on purpose: Settings (the four original profile
      // links) and the landing-page editor's "Social links & quick messaging"
      // section (all of them, including WhatsApp). Both write dotted paths,
      // so neither can blank out a field the other owns.
      social: {
        facebook: { type: String, default: "" },
        instagram: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        x: { type: String, default: "" },
        github: { type: String, default: "" },
        // Not a profile URL: a number to open a chat with, plus the message
        // pre-typed into the visitor's WhatsApp when they tap it. An empty
        // number means "no WhatsApp button" — nothing renders.
        whatsapp: {
          number: { type: String, default: "" },
          message: { type: String, default: "" },
        },
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
      faqHeading: { type: String, default: "" },

      // Trust-building Q&A, rendered as an accordion above the contact form.
      // Either written by hand in the editor or generated by the agent (see
      // app/api/agent/faq/route.js) and then edited — it's ordinary tenant
      // content once saved, with no marker of which produced it.
      //
      // Empty means the section doesn't render at all, which is the correct
      // state for every tenant who existed before this shipped.
      faq: {
        type: [
          {
            question: { type: String, default: "" },
            answer: { type: String, default: "" },
          },
        ],
        default: [],
        validate: {
          validator: (v) => v.length <= FAQ_LIMIT,
          message: `At most ${FAQ_LIMIT} FAQ entries.`,
        },
      },

      // Whether the social/WhatsApp row also appears in the hero. The footer
      // row is unconditional (it's where visitors look for it); the hero one
      // is a deliberate, high-contrast call to action and some tenants won't
      // want it competing with their main CTA button.
      showSocialInHero: { type: Boolean, default: true },

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
            // Only meaningful for the choice types ("select" / "checkbox").
            // Empty for every other field, and for every field saved before
            // choice fields shipped.
            options: { type: [String], default: [] },
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
      // Optional HTTPS endpoint POSTed the moment a lead is captured, for a
      // tenant who wants the lead in their own tooling (Make, n8n, Zapier, a
      // Slack incoming webhook) without waiting for an email. Empty means
      // "off" — see lib/webhooks.js for the payload and the failure policy.
      webhookUrl: { type: String, default: "" },
    },

    // How the CRM opens a WhatsApp conversation with a lead — the message is
    // pre-typed into the owner's WhatsApp, never sent automatically. See
    // lib/socialLinks.js for the supported {placeholders}.
    outreach: {
      whatsappTemplate: { type: String, default: DEFAULT_OUTREACH_TEMPLATE },
      // How long a lead may go quiet before the CRM flags it — see
      // lib/followUp.js. "never" switches reminders off entirely, which is a
      // real answer for a business whose sales cycle is measured in months.
      followUpInterval: {
        type: String,
        enum: FOLLOW_UP_INTERVALS,
        default: DEFAULT_FOLLOW_UP_INTERVAL,
      },
      // The message the "Quick follow-up" button pre-types. {name} is the
      // only placeholder. Empty means "use the translated default", so a
      // tenant who never touches this still gets it in their own language.
      followUpTemplate: { type: String, default: "" },
    },

    // ── Moderation ──────────────────────────────────────────────────────────
    //
    // Set only by a platform admin (see app/api/admin/*). Two independent
    // levers, deliberately not one flag:
    //
    //   moderation.pageBlocked  — the public landing page stops rendering and
    //                             returns a 451 notice. The owner keeps their
    //                             account, their CRM, and their leads, and can
    //                             still sign in and fix the content.
    //   User.suspendedAt        — the person can't sign in at all.
    //
    // Most enforcement is the first one: taking a page down is reversible and
    // proportionate, where locking someone out of their own customer data
    // usually isn't.
    moderation: {
      pageBlocked: { type: Boolean, default: false },
      blockedAt: { type: Date, default: null },
      // Free text shown to the admin team, never to the public — the public
      // notice is a fixed, translated string.
      blockedReason: { type: String, default: "" },
      blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      // Denormalized counter so the moderation queue can sort by "most
      // reported" without an aggregation over every report on every load.
      openReportCount: { type: Number, default: 0 },
      lastReportedAt: { type: Date, default: null },
    },

    plan: { type: String, enum: ["free", "pro"], default: "free" },
    // Set once a tenant starts a checkout (customer) or completes one
    // (subscription) — see lib/stripe.js and app/api/billing/webhook/route.js.
    // Both null for a tenant that's never touched billing.
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },

    // A tenant that wants their own hostname on their landing page — see
    // lib/vercelDomains.js and app/api/tenant/domain/route.js. `status`
    // mirrors Vercel's own verification state rather than inventing a
    // parallel one; `verification` holds whatever DNS records Vercel asked
    // for, shown to the tenant as setup instructions.
    customDomain: {
      hostname: { type: String, default: null },
      status: {
        type: String,
        enum: ["pending", "verified", "error"],
        default: "pending",
      },
      verification: { type: mongoose.Schema.Types.Mixed, default: null },
      addedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);

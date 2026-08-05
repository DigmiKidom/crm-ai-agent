import mongoose from "mongoose";

// Landing page limits are enforced in three places on purpose: the editor UI
// caps what you can add, the API rejects overflow, and these constants are the
// single source of truth both import.
export const MAX_FEATURES = 3;
export const MAX_BACKGROUNDS = 3;
export const MAX_GALLERY = 6;
export const GALLERY_COLUMNS = [2, 3, 4];

const TenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    industry: { type: String, default: "" },
    templateId: { type: String, default: "default" },

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
      subheadline: { type: String, default: "Tell your visitors why they should reach out." },
      ctaLabel: { type: String, default: "Get in touch" },
      showLogo: { type: Boolean, default: true },
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

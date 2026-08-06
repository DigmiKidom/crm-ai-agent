import { findContentLanguage, isRtlLanguage } from "@/lib/i18n/languages";
import { FIELD_TYPES, defaultFormFields } from "@/lib/formFields";

// Fallback strings for the public landing page.
//
// The agent now generates these per tenant in whatever language it wrote the
// page in, so this pack is only reached in two cases:
//
//   1. A tenant whose page was generated before that shipped, and who hasn't
//      re-run AI Setup since.
//   2. A brand-new tenant who hasn't run AI Setup at all yet.
//
// It covers only the two languages the product UI itself supports. Anything
// else falls back to English — but only for these labels, and only until the
// owner regenerates, at which point the agent's own output takes over and the
// page can be in any language at all.
const FALLBACKS = {
  en: {
    name: "Name",
    email: "Email",
    phone: "Phone (optional)",
    message: "Message (optional)",
    sending: "Sending…",
    success: "Thanks — we'll be in touch shortly.",
    error: "Something went wrong. Please try again.",
    submit: "Get in touch",
    galleryHeading: "Gallery",
    contactHeading: "Get in touch",
    subheadline: "Tell your visitors why they should reach out.",
    teamHeading: "Meet the team",
    viewCv: "View CV",
  },
  he: {
    name: "שם",
    email: "אימייל",
    phone: "טלפון (לא חובה)",
    message: "הודעה (לא חובה)",
    sending: "שולח…",
    success: "תודה — נחזור אליכם בהקדם.",
    error: "משהו השתבש. נסו שוב.",
    submit: "צרו קשר",
    galleryHeading: "גלריה",
    contactHeading: "צרו קשר",
    subheadline: "ספרו למבקרים למה כדאי לפנות אליכם.",
    teamHeading: "הצוות שלנו",
    viewCv: "צפייה בקורות חיים",
  },
};

const EMPTY = (v) => typeof v !== "string" || v.trim() === "";

/**
 * Resolves everything the public page needs to render text correctly, in one
 * place: the language, its direction, and every visitor-facing string.
 *
 * Per-field fallback is deliberate — a tenant generated before `formLabels`
 * existed still has a real `ctaLabel`, and a partial agent response shouldn't
 * blank out a label. Each string independently prefers the agent's value.
 */
export function resolveLandingCopy(tenant) {
  const landingPage = tenant?.landingPage ?? {};
  const stored = landingPage.language ?? {};

  const code = (stored.code || "en").toLowerCase();
  const known = findContentLanguage(code);

  // Prefer the stored direction (the agent may have used a language we don't
  // list); fall back to the known entry, then to script detection.
  const dir =
    stored.dir === "rtl" || stored.dir === "ltr"
      ? stored.dir
      : known?.dir ?? (isRtlLanguage(code) ? "rtl" : "ltr");

  const pack = FALLBACKS[code] ?? FALLBACKS.en;
  const generated = landingPage.formLabels ?? {};

  const pick = (value, fallback) => (EMPTY(value) ? fallback : value);

  // The tenant's own saved field list, once they've touched the form editor;
  // otherwise the four core fields, labeled from the language's fallback
  // pack. Either way every visitor-facing string here comes from the tenant's
  // content language, never a hardcoded English default rendered under
  // non-English copy.
  const fields =
    Array.isArray(landingPage.formFields) && landingPage.formFields.length > 0
      ? landingPage.formFields.map((f) => ({
          key: f.key,
          crmField: f.crmField || "custom",
          label: pick(f.label, f.key),
          type: FIELD_TYPES.includes(f.type) ? f.type : "text",
          required: Boolean(f.required),
        }))
      : defaultFormFields(pack);

  return {
    language: { code, name: stored.name || known?.name || "English", dir },
    isRtl: dir === "rtl",
    galleryHeading: pick(landingPage.galleryHeading, pack.galleryHeading),
    contactHeading: pick(landingPage.contactHeading, pack.contactHeading),
    teamHeading: pack.teamHeading,
    viewCvLabel: pack.viewCv,
    subheadline: pick(landingPage.subheadline, pack.subheadline),
    ctaLabel: pick(landingPage.ctaLabel, pack.submit),
    fields,
    formLabels: {
      name: pick(generated.name, pack.name),
      email: pick(generated.email, pack.email),
      phone: pick(generated.phone, pack.phone),
      message: pick(generated.message, pack.message),
      sending: pick(generated.sending, pack.sending),
      success: pick(generated.success, pack.success),
      error: pick(generated.error, pack.error),
    },
  };
}

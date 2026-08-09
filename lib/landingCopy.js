import { findContentLanguage, isRtlLanguage } from "@/lib/i18n/languages";
import { FIELD_TYPES, defaultFormFields, isChoiceType } from "@/lib/formFields";
import { resolveSocialLinks } from "@/lib/socialLinks";

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
    faqHeading: "Frequently asked questions",
    subheadline: "Tell your visitors why they should reach out.",
    teamHeading: "Meet the team",
    socialLabel: "Contact us on social media",
    viewCv: "View CV",
    poweredBy: "Powered by CeRAmony — Connected to your business",
    galleryPhotoAlt: "{label} — photo {i} of {total}",
    headlineFallback: "Grow {name}",
    // The abuse-report link and modal in the footer. Part of this pack rather
    // than the product dictionary because it renders on the tenant's public
    // page, in the tenant's content language — a visitor has no dashboard
    // locale for us to read.
    report: {
      link: "Report this page",
      title: "Report this page",
      intro:
        "Tell us what's wrong with this page. Reports go to Ceramony's moderation team, not to the business.",
      reasonLabel: "What's the problem?",
      reasonPlaceholder: "Choose a reason",
      reasons: {
        spam: "Spam or misleading",
        harassment: "Harassment or hate",
        fraud: "Fraud or phishing",
        copyright: "Copyright infringement",
        abusive: "Abusive or explicit content",
        other: "Something else",
      },
      notesLabel: "Anything else we should know? (optional)",
      emailLabel: "Your email, if you'd like a reply (optional)",
      submit: "Send report",
      sending: "Sending…",
      cancel: "Cancel",
      close: "Close",
      thanksTitle: "Thanks — we've got it",
      thanksBody:
        "A person will review this page. We don't share who reported it with the business.",
      error: "We couldn't send that just now. Please try again shortly.",
    },
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
    faqHeading: "שאלות נפוצות",
    subheadline: "ספרו למבקרים למה כדאי לפנות אליכם.",
    teamHeading: "הצוות שלנו",
    socialLabel: "צרו איתנו קשר ברשתות החברתיות",
    viewCv: "צפייה בקורות חיים",
    poweredBy: "מופעל באמצעות CeRAmony — מחוברים לעסק שלך",
    galleryPhotoAlt: "{label} — תמונה {i} מתוך {total}",
    headlineFallback: "מצמיחים את {name}",
    report: {
      link: "דיווח על תוכן פוגעני",
      title: "דיווח על הדף הזה",
      intro:
        "ספרו לנו מה לא בסדר בדף הזה. הדיווח מגיע לצוות המודרציה של Ceramony, ולא לבעל העסק.",
      reasonLabel: "מה הבעיה?",
      reasonPlaceholder: "בחרו סיבה",
      reasons: {
        spam: "ספאם או הטעיה",
        harassment: "הטרדה או שנאה",
        fraud: "הונאה או פישינג",
        copyright: "הפרת זכויות יוצרים",
        abusive: "תוכן פוגעני או מיני",
        other: "משהו אחר",
      },
      notesLabel: "משהו נוסף שכדאי שנדע? (לא חובה)",
      emailLabel: "האימייל שלכם, אם תרצו תשובה (לא חובה)",
      submit: "שליחת דיווח",
      sending: "שולח…",
      cancel: "ביטול",
      close: "סגירה",
      thanksTitle: "תודה — קיבלנו",
      thanksBody: "אדם אמיתי יבדוק את הדף. לא נמסור לבעל העסק מי דיווח.",
      error: "לא הצלחנו לשלוח כרגע. נסו שוב בעוד רגע.",
    },
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
  const tenantName = tenant?.name || "";

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
      ? landingPage.formFields.map((f) => {
          const type = FIELD_TYPES.includes(f.type) ? f.type : "text";
          const options = Array.isArray(f.options) ? f.options.filter(Boolean) : [];
          return {
            key: f.key,
            crmField: f.crmField || "custom",
            label: pick(f.label, f.key),
            // A choice field that somehow lost its options degrades to a
            // plain text input rather than rendering an unanswerable
            // control — the visitor can still tell us something.
            type: isChoiceType(type) && options.length === 0 ? "text" : type,
            required: Boolean(f.required),
            options,
          };
        })
      : defaultFormFields(pack);

  return {
    language: { code, name: stored.name || known?.name || "English", dir },
    isRtl: dir === "rtl",
    galleryHeading: pick(landingPage.galleryHeading, pack.galleryHeading),
    contactHeading: pick(landingPage.contactHeading, pack.contactHeading),
    faqHeading: pick(landingPage.faqHeading, pack.faqHeading),
    // Only entries with both halves filled in ever reach a visitor — a
    // half-written FAQ row renders as a question with no answer, which is
    // worse than no FAQ at all.
    faq: (landingPage.faq || []).filter((item) => item?.question?.trim() && item?.answer?.trim()),
    // Render-ready: one entry per platform the tenant actually filled in,
    // each with its final href (WhatsApp included, message already encoded).
    socialLinks: resolveSocialLinks(tenant?.profile?.social),
    showSocialInHero: landingPage.showSocialInHero !== false,
    teamHeading: pack.teamHeading,
    socialLabel: pack.socialLabel,
    viewCvLabel: pack.viewCv,
    subheadline: pick(landingPage.subheadline, pack.subheadline),
    ctaLabel: pick(landingPage.ctaLabel, pack.submit),
    headlineFallback: pack.headlineFallback.replace("{name}", tenantName),
    poweredByLabel: pack.poweredBy,
    // Falls back to the English pack wholesale rather than per-key: a
    // half-translated report form is worse than a consistently English one,
    // and this is chrome we write, not copy the agent generates.
    report: pack.report ?? FALLBACKS.en.report,
    galleryPhotoAlt: (label, i, total) =>
      pack.galleryPhotoAlt
        .replace("{label}", label)
        .replace("{i}", i)
        .replace("{total}", total),
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

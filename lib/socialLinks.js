// Social profiles and WhatsApp quick messaging.
//
// Model-free on purpose — the landing-page editor (a client component), the
// public landing templates, and the CRM's one-click WhatsApp button all need
// these helpers, and none of them can pull Mongoose into their bundle. Same
// pattern as lib/formFields.js: the Tenant model and the API routes import
// from here rather than redefining any of it.

/**
 * The platforms a tenant can link, in the order they render on the page.
 *
 * `whatsapp` is deliberately first and deliberately different: it isn't a
 * profile URL but a phone number plus a pre-filled opening message, because
 * the point of it is starting a conversation, not being followed.
 */
export const SOCIAL_PLATFORMS = [
  { key: "whatsapp", label: "WhatsApp", brandColor: "#25D366", kind: "whatsapp" },
  { key: "instagram", label: "Instagram", brandColor: "#E1306C", kind: "url", prefix: "https://instagram.com/" },
  { key: "facebook", label: "Facebook", brandColor: "#1877F2", kind: "url", prefix: "https://facebook.com/" },
  { key: "linkedin", label: "LinkedIn", brandColor: "#0A66C2", kind: "url", prefix: "https://linkedin.com/in/" },
  { key: "github", label: "GitHub", brandColor: "#181717", kind: "url", prefix: "https://github.com/" },
  { key: "x", label: "X", brandColor: "#000000", kind: "url", prefix: "https://x.com/" },
];

export const SOCIAL_KEYS = SOCIAL_PLATFORMS.map((p) => p.key);

/** URL platforms only — everything except WhatsApp, which stores a number. */
export const SOCIAL_URL_KEYS = SOCIAL_PLATFORMS.filter((p) => p.kind === "url").map((p) => p.key);

export const MAX_WHATSAPP_MESSAGE = 300;

/**
 * A sensible starter message, offered as a placeholder in the editor rather
 * than saved by default — a tenant who leaves it blank gets a plain wa.me
 * link with no pre-filled text, which is the correct "I didn't configure
 * this" behaviour.
 */
export const DEFAULT_WHATSAPP_MESSAGE =
  "Hi, I came across your website and would like to learn more!";

/**
 * Strips a phone number down to what wa.me accepts: digits only, no "+",
 * no spaces, dashes, or parentheses.
 *
 * A leading "00" international prefix is rewritten to nothing, since wa.me
 * wants the bare country code — "00972…" and "+972…" both mean the same
 * number, and a tenant will type whichever their country writes.
 */
export function normalizePhone(input) {
  const digits = String(input ?? "").replace(/\D+/g, "");
  if (!digits) return "";
  const trimmed = digits.startsWith("00") ? digits.slice(2) : digits;
  // 7 is the shortest plausible national number, 15 the E.164 maximum.
  return trimmed.slice(0, 15);
}

export function isValidPhone(input) {
  const digits = normalizePhone(input);
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Builds the wa.me deep link. The message is URL-encoded via
 * encodeURIComponent, which is what WhatsApp expects — a raw newline or "&"
 * in the tenant's template otherwise truncates the message silently.
 *
 * Returns "" when there's no usable number, so callers can treat a falsy
 * result as "don't render the button" without a second validity check.
 */
export function whatsappUrl(phone, message = "") {
  const number = normalizePhone(phone);
  if (!number) return "";
  const text = String(message ?? "").trim();
  return text
    ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${number}`;
}

/**
 * A WhatsApp share link with no recipient — WhatsApp shows its own contact
 * picker and pre-fills the message.
 *
 * Deliberately separate from whatsappUrl(), which returns "" for a missing
 * number because everywhere it is used ("message this lead") a link with
 * nobody on the other end is a bug. Here the absence is the point: a saved
 * template isn't addressed to anyone until the moment it's sent.
 */
export function whatsappShareUrl(message = "") {
  const text = String(message ?? "").trim();
  return text ? `https://wa.me/?text=${encodeURIComponent(text)}` : "https://wa.me/";
}

/** Turns a handle ("@acme") or bare path into a full https URL. */
function toProfileUrl(platform, value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  // Protocol-relative or bare domain — assume https rather than dropping it.
  if (/^[\w-]+\.[\w.-]+\//.test(raw)) return `https://${raw}`;
  return `${platform.prefix}${raw.replace(/^@/, "")}`;
}

/**
 * Normalizes whatever the editor submitted into the shape stored on
 * Tenant.profile.social. Unknown keys are dropped rather than trusted, and
 * every value is length-capped.
 */
export function normalizeSocial(input) {
  const source = input && typeof input === "object" ? input : {};
  const out = {};

  for (const platform of SOCIAL_PLATFORMS) {
    if (platform.kind === "whatsapp") continue;
    out[platform.key] = String(source[platform.key] ?? "").trim().slice(0, 200);
  }

  const whatsapp = source.whatsapp && typeof source.whatsapp === "object" ? source.whatsapp : {};
  out.whatsapp = {
    number: normalizePhone(whatsapp.number),
    message: String(whatsapp.message ?? "").trim().slice(0, MAX_WHATSAPP_MESSAGE),
  };

  return out;
}

/**
 * Resolves the tenant's saved social config into a render-ready list for the
 * public page: one entry per platform they actually filled in, each with a
 * final href. Anything blank or unusable is simply absent, so a template can
 * render the array without a single conditional of its own.
 */
export function resolveSocialLinks(social) {
  const source = social && typeof social === "object" ? social : {};
  const links = [];

  for (const platform of SOCIAL_PLATFORMS) {
    if (platform.kind === "whatsapp") {
      const href = whatsappUrl(source.whatsapp?.number, source.whatsapp?.message);
      if (href) {
        links.push({ key: platform.key, label: platform.label, href, brandColor: platform.brandColor });
      }
      continue;
    }

    const href = toProfileUrl(platform, source[platform.key]);
    if (href) {
      links.push({ key: platform.key, label: platform.label, href, brandColor: platform.brandColor });
    }
  }

  return links;
}

// ── CRM outreach ────────────────────────────────────────────────────────────

export const MAX_OUTREACH_TEMPLATE = 400;

/**
 * Default opening message for the CRM's one-click WhatsApp button. Uses the
 * same {placeholder} syntax as the i18n dictionaries so it reads familiarly,
 * and every placeholder is optional — fillOutreachTemplate() drops the
 * sentence around one it can't fill rather than shipping a literal "{service}"
 * to a real customer.
 */
export const DEFAULT_OUTREACH_TEMPLATE =
  "Hi {name}, thanks for reaching out regarding {service}. How can I help you today?";

/**
 * What a lead was interested in, for {service}: the first non-empty custom
 * field answer (a tenant's "Service" dropdown lands there), falling back to
 * the free-text message. Trimmed short — this goes into a chat window, not a
 * report.
 */
export function leadInterest(lead) {
  const custom = Array.isArray(lead?.customFields)
    ? lead.customFields.find((f) => String(f?.value || "").trim())
    : null;
  const value = custom?.value || lead?.message || "";
  return String(value).trim().replace(/\s+/g, " ").slice(0, 80);
}

/**
 * Fills the tenant's outreach template for one lead.
 *
 * An unfillable {service} takes its surrounding clause with it — " regarding
 * {service}" reads as a broken mail-merge to the person receiving it, which
 * is worse than a slightly shorter greeting.
 */
export function fillOutreachTemplate(template, { name = "", company = "", service = "" } = {}) {
  let out = String(template || DEFAULT_OUTREACH_TEMPLATE);

  if (!service.trim()) {
    // Drops the placeholder plus the connector immediately in front of it:
    // one preceding word ("regarding", "about", "בנוגע") and anything glued
    // to the placeholder itself (Hebrew's prefixed "ל{service}"). Deliberately
    // narrow — an earlier version deleted everything back to the last comma,
    // which turned "thanks for reaching out regarding {service}" into
    // "thanks" and lost the whole sentence.
    out = out
      .replace(/\s*(\S+\s+)?\S*\{service\}/g, "")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([.!?,،])/g, "$1");
  }

  return out
    .replace(/\{name\}/g, name.trim())
    .replace(/\{company\}/g, company.trim())
    .replace(/\{service\}/g, service.trim())
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, MAX_OUTREACH_TEMPLATE);
}

/**
 * The full wa.me link for messaging one lead. Empty when the lead never gave
 * a phone number — the CRM hides the button entirely in that case rather than
 * rendering a dead one.
 */
export function leadWhatsappUrl(lead, { template, companyName } = {}) {
  if (!lead?.phone) return "";
  const message = fillOutreachTemplate(template, {
    name: lead.name || "",
    company: companyName || "",
    service: leadInterest(lead),
  });
  return whatsappUrl(lead.phone, message);
}

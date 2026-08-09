// Custom lead-capture form fields.
//
// Model-free on purpose — the landing-page editor (a client component) and
// the public LeadForm need these constants without pulling Mongoose into the
// browser bundle (see lib/resumeLimits.js for the same pattern). The Tenant
// and Lead models, the leads API, and lib/landingCopy.js all import from
// here rather than redefining any of this.

export const MAX_FORM_FIELDS = 8;

export const FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "textarea",
  "number",
  "date",
  // Choice fields. Both store their choices in `options` below: "select"
  // renders a dropdown (one answer), "checkbox" a list of tick boxes (any
  // number of answers, stored comma-joined on the lead).
  "select",
  "checkbox",
];

/** Types whose `options` list is meaningful; everything else ignores it. */
export const CHOICE_TYPES = ["select", "checkbox"];

export const MAX_FIELD_OPTIONS = 12;
export const MAX_OPTION_LENGTH = 60;

export function isChoiceType(type) {
  return CHOICE_TYPES.includes(type);
}

// The four fields every tenant starts with. Each maps straight onto a real
// column on the Lead document (lib/models/Lead.js) rather than the generic
// customFields bucket, which is what lets the leads list, pipeline board,
// and overview page keep reading lead.name/email/phone/message unchanged.
//
// "name" is special: it can't be removed, retyped, or made optional, because
// it's the one thing every other CRM surface assumes a lead has.
export const CORE_FIELDS = {
  name: { crmField: "name", type: "text", removable: false },
  email: { crmField: "email", type: "email", removable: true },
  phone: { crmField: "phone", type: "tel", removable: true },
  message: { crmField: "message", type: "textarea", removable: true },
};

export function isCoreKey(key) {
  return Object.prototype.hasOwnProperty.call(CORE_FIELDS, key);
}

export function crmFieldFor(key) {
  return CORE_FIELDS[key]?.crmField || "custom";
}

function randomKey() {
  return `field_${Math.random().toString(36).slice(2, 9)}`;
}

/** A fresh custom field for the editor's "Add field" button. */
export function blankCustomField() {
  return { key: randomKey(), crmField: "custom", label: "", type: "text", required: false, options: [] };
}

/**
 * Normalizes a choice field's option list: trimmed, de-duplicated, capped.
 * Shared by the editor (which uses it to keep its own state clean) and the
 * API route (which can't trust the editor).
 */
export function normalizeOptions(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    const value = String(raw ?? "").trim().slice(0, MAX_OPTION_LENGTH);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= MAX_FIELD_OPTIONS) break;
  }
  return out;
}

/**
 * The four core fields, labeled from `labels` (typically the per-language
 * fallback pack in lib/landingCopy.js) when a tenant has no formFields saved
 * yet — either brand new, or generated before this shipped.
 */
export function defaultFormFields(labels = {}) {
  return [
    { key: "name", crmField: "name", label: labels.name || "Name", type: "text", required: true, options: [] },
    { key: "email", crmField: "email", label: labels.email || "Email", type: "email", required: true, options: [] },
    { key: "phone", crmField: "phone", label: labels.phone || "Phone", type: "tel", required: false, options: [] },
    {
      key: "message",
      crmField: "message",
      label: labels.message || "Message",
      type: "textarea",
      required: false,
      options: [],
    },
  ];
}

/**
 * Validates and normalizes a form-field list submitted to the landing-page
 * PATCH route. Throws a plain Error with a user-facing message on the first
 * problem found; the route turns that straight into its 400 response.
 *
 * crmField and (for core keys) type are derived server-side rather than
 * trusted from the request — a tenant can't relabel a custom field into
 * writing over lead.email by sending crmField: "email" on it.
 */
// This module has no request context, so it can't call a translator itself —
// each thrown error carries a stable `code` (and any data the message needs
// to interpolate) rather than only an English `message`. The API route maps
// `code` to a localized string; `message` is just an English fallback for
// anything that logs the raw error.
function fieldError(code, message, data) {
  return Object.assign(new Error(message), { code, ...data });
}

export function normalizeFormFields(input) {
  if (!Array.isArray(input) || input.length === 0) {
    throw fieldError("EMPTY", "Add at least one form field.");
  }
  if (input.length > MAX_FORM_FIELDS) {
    throw fieldError("TOO_MANY", `You can have at most ${MAX_FORM_FIELDS} form fields.`);
  }

  const seenKeys = new Set();
  const cleaned = [];
  let hasName = false;

  for (const raw of input) {
    const key = String(raw?.key || "").trim();
    const label = String(raw?.label || "").trim();
    if (!key || !label) throw fieldError("MISSING_LABEL", "Every field needs a name.");
    if (seenKeys.has(key)) throw fieldError("DUPLICATE_KEY", "Field names must be unique.");
    seenKeys.add(key);

    const core = CORE_FIELDS[key];
    const type = core ? core.type : raw?.type;
    if (!FIELD_TYPES.includes(type)) {
      throw fieldError("UNKNOWN_TYPE", `"${label}" has an unknown field type.`, { label });
    }
    if (core && core.removable === false) hasName = true;

    // A dropdown or checkbox group with nothing to pick from renders as an
    // empty control the visitor can't answer — caught here rather than left
    // to break the public page.
    const options = isChoiceType(type) ? normalizeOptions(raw?.options) : [];
    if (isChoiceType(type) && options.length === 0) {
      throw fieldError("MISSING_OPTIONS", `"${label}" needs at least one choice.`, { label });
    }

    cleaned.push({
      key,
      crmField: crmFieldFor(key),
      label: label.slice(0, 80),
      type,
      // Core "name" is always required; everything else follows the tenant.
      required: key === "name" ? true : Boolean(raw?.required),
      options,
    });
  }

  if (!hasName) throw fieldError("MISSING_NAME", "The form must include a name field.");

  return cleaned;
}

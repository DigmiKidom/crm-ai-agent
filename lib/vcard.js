// VCard 3.0 generation for "add this lead to my phone".
//
// Model-free (same reason as lib/formFields.js and lib/socialLinks.js): the
// button that builds and shares the card is a client component, and the
// download route builds the same card server-side. One implementation, so a
// contact saved from a phone and one downloaded on a laptop are identical.
//
// 3.0 rather than 4.0 deliberately: iOS Contacts and Google Contacts both
// import 3.0 without complaint, and 4.0 still trips up older Android contact
// apps. There is nothing here that needs 4.0.

const MAX_NOTE = 800;

/**
 * VCard escaping, per RFC 2426 §2.4.2: backslash, comma, semicolon and
 * newlines are all structural in this format. An unescaped semicolon in a
 * company name silently truncates the field on import — the kind of bug that
 * only shows up in someone's phone, days later.
 */
function esc(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Splits a display name into VCard's structured N field (family;given).
 * Crude on purpose — a lead form collects one free-text name, so anything
 * cleverer would be guessing. Everything after the first token is the family
 * name, which is right for "Dana Cohen" and harmless for a single word.
 */
function structuredName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given: "", family: "" };
  if (parts.length === 1) return { given: parts[0], family: "" };
  return { given: parts[0], family: parts.slice(1).join(" ") };
}

/**
 * The note body: the tenant's own notes plus the lead's form answers, so the
 * contact saved to a phone carries the context that made them worth saving.
 * Built from what the CRM already knows — nothing here is generated.
 */
function buildNote(lead, { businessName = "", capturedLabel = "", viaLabel = "" } = {}) {
  const lines = [];

  if (businessName && viaLabel) lines.push(`${viaLabel} ${businessName}`);
  if (lead?.message) lines.push(String(lead.message).trim());

  for (const field of lead?.customFields || []) {
    const value = String(field?.value || "").trim();
    if (value) lines.push(`${field.label || field.key}: ${value}`);
  }

  if (lead?.notes) lines.push(String(lead.notes).trim());

  if (lead?.createdAt && capturedLabel) {
    const date = new Date(lead.createdAt);
    if (!Number.isNaN(date.getTime())) {
      lines.push(`${capturedLabel} ${date.toISOString().slice(0, 10)}`);
    }
  }

  return lines.join("\n").slice(0, MAX_NOTE);
}

/**
 * Builds the .vcf text for one lead.
 *
 * `labels` carries the few human-readable strings that end up inside the card
 * (it's saved in the owner's phone, so it follows the owner's dashboard
 * language) — passed in rather than translated here, since this module is
 * shared by a client component and a route handler.
 */
export function buildVCard(lead, { businessName = "", labels = {} } = {}) {
  const { given, family } = structuredName(lead?.name);
  const note = buildNote(lead, {
    businessName,
    capturedLabel: labels.captured || "Captured:",
    viaLabel: labels.via || "Lead from",
  });

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(family)};${esc(given)};;;`,
    `FN:${esc(lead?.name || "")}`,
  ];

  // Every field is conditional: a card with an empty TEL line imports as a
  // contact with a blank phone number, which is worse than no line at all.
  if (businessName) lines.push(`ORG:${esc(businessName)}`);
  if (lead?.phone) lines.push(`TEL;TYPE=CELL:${esc(lead.phone)}`);
  if (lead?.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(lead.email)}`);
  if (note) lines.push(`NOTE:${esc(note)}`);

  lines.push(`REV:${new Date().toISOString()}`);
  lines.push("END:VCARD");

  // CRLF, not \n: RFC 2426 requires it, and iOS in particular rejects cards
  // that use bare newlines between properties.
  return `${lines.join("\r\n")}\r\n`;
}

/** A safe, recognisable filename for the downloaded card. */
export function vcardFilename(name) {
  const clean = String(name || "contact")
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${clean || "contact"}.vcf`;
}

// Social links, WhatsApp deep links, CRM outreach templates, choice fields,
// and the webhook allowlist.
//
// All of this is pure logic that decides what a real customer sees in their
// WhatsApp window, or what a crafted request is allowed to write — the parts
// worth testing without a browser or a database.
import {
  normalizePhone,
  isValidPhone,
  whatsappUrl,
  normalizeSocial,
  resolveSocialLinks,
  fillOutreachTemplate,
  leadInterest,
  leadWhatsappUrl,
  DEFAULT_OUTREACH_TEMPLATE,
} from "../lib/socialLinks.js";
import { normalizeFormFields, normalizeOptions } from "../lib/formFields.js";
import { normalizeFaq } from "../lib/faq.js";
import { isAllowedWebhookUrl } from "../lib/webhooks.js";

let pass = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log("  ok   " + name);
    pass++;
  } catch (e) {
    console.log("  FAIL " + name + "\n        " + e.message);
    failures.push(name);
  }
}

function eq(actual, expected, what = "") {
  if (actual !== expected) {
    throw new Error(`${what}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log("\n— phone numbers —");

check("strips spaces, dashes, brackets and the plus sign", () => {
  eq(normalizePhone("+972 (50) 123-4567"), "972501234567");
});

check("a 00 international prefix becomes the bare country code", () => {
  eq(normalizePhone("00972501234567"), "972501234567");
});

check("rejects anything too short to dial", () => {
  eq(isValidPhone("12345"), false);
  eq(isValidPhone(""), false);
  eq(isValidPhone("+972 50 123 4567"), true);
});

console.log("\n— wa.me links —");

check("encodes the pre-filled message", () => {
  const url = whatsappUrl("+972501234567", "Hi & hello — I'd like a quote?");
  eq(url.startsWith("https://wa.me/972501234567?text="), true, "wrong base: ");
  // The characters that silently truncate a WhatsApp message if left raw.
  if (/[&?#]/.test(url.split("text=")[1])) throw new Error("unencoded reserved character: " + url);
  eq(decodeURIComponent(url.split("text=")[1]), "Hi & hello — I'd like a quote?");
});

check("no message means a plain chat link, not an empty text param", () => {
  eq(whatsappUrl("972501234567", "   "), "https://wa.me/972501234567");
});

check("no number means no link at all", () => {
  eq(whatsappUrl("", "hello"), "");
});

check("a Hebrew message round-trips through encoding", () => {
  const url = whatsappUrl("972501234567", "שלום, אשמח לפרטים");
  eq(decodeURIComponent(url.split("text=")[1]), "שלום, אשמח לפרטים");
});

console.log("\n— social profiles —");

check("a bare handle becomes a full profile URL", () => {
  const links = resolveSocialLinks({ instagram: "@acme", github: "acme-dev" });
  eq(links.find((l) => l.key === "instagram").href, "https://instagram.com/acme");
  eq(links.find((l) => l.key === "github").href, "https://github.com/acme-dev");
});

check("a full URL is left alone", () => {
  const links = resolveSocialLinks({ linkedin: "https://linkedin.com/company/acme" });
  eq(links[0].href, "https://linkedin.com/company/acme");
});

check("blank platforms are absent, not empty entries", () => {
  const links = resolveSocialLinks({ facebook: "  ", x: "", instagram: "acme" });
  eq(links.length, 1);
  eq(links[0].key, "instagram");
});

check("WhatsApp comes first, so it leads the row", () => {
  const links = resolveSocialLinks({ x: "acme", whatsapp: { number: "972501234567", message: "hi" } });
  eq(links[0].key, "whatsapp");
});

check("normalizeSocial drops unknown platforms", () => {
  const clean = normalizeSocial({ instagram: "acme", myspace: "acme", whatsapp: { number: "+972 50 123 4567" } });
  eq("myspace" in clean, false);
  eq(clean.whatsapp.number, "972501234567");
});

console.log("\n— CRM outreach —");

const LEAD = {
  name: "Dana",
  phone: "+972 50 123 4567",
  message: "Looking for a quote",
  customFields: [{ key: "service", label: "Service", value: "Kitchen renovation" }],
};

check("fills name and service from the lead", () => {
  eq(
    fillOutreachTemplate(DEFAULT_OUTREACH_TEMPLATE, { name: "Dana", service: "a consultation" }),
    "Hi Dana, thanks for reaching out regarding a consultation. How can I help you today?"
  );
});

check("an unfillable {service} takes its clause with it", () => {
  const out = fillOutreachTemplate(DEFAULT_OUTREACH_TEMPLATE, { name: "Dana" });
  if (out.includes("{service}")) throw new Error("placeholder shipped to the customer: " + out);
  if (/regarding\s*\./.test(out)) throw new Error("dangling connector left behind: " + out);
  eq(out, "Hi Dana, thanks for reaching out. How can I help you today?");
});

check("service prefers a custom field answer over the free-text message", () => {
  eq(leadInterest(LEAD), "Kitchen renovation");
  eq(leadInterest({ message: "Looking for a quote" }), "Looking for a quote");
  eq(leadInterest({}), "");
});

check("builds the full lead link", () => {
  const url = leadWhatsappUrl(LEAD, { template: DEFAULT_OUTREACH_TEMPLATE, companyName: "Acme" });
  eq(url.startsWith("https://wa.me/972501234567?text="), true, "wrong base: ");
  eq(
    decodeURIComponent(url.split("text=")[1]),
    "Hi Dana, thanks for reaching out regarding Kitchen renovation. How can I help you today?"
  );
});

check("a lead with no phone number gets no link", () => {
  eq(leadWhatsappUrl({ name: "Dana" }, { template: DEFAULT_OUTREACH_TEMPLATE }), "");
});

console.log("\n— choice fields —");

check("options are trimmed, de-duplicated and capped", () => {
  const out = normalizeOptions([" Cut ", "Cut", "", "Colour", null]);
  eq(JSON.stringify(out), JSON.stringify(["Cut", "Colour"]));
  eq(normalizeOptions(Array.from({ length: 30 }, (_, i) => `o${i}`)).length, 12);
});

check("a dropdown with no choices is rejected", () => {
  let code = "";
  try {
    normalizeFormFields([
      { key: "name", label: "Name" },
      { key: "svc", label: "Service", type: "select", options: [] },
    ]);
  } catch (e) {
    code = e.code;
  }
  eq(code, "MISSING_OPTIONS");
});

check("a valid choice field survives normalization", () => {
  const [, svc] = normalizeFormFields([
    { key: "name", label: "Name" },
    { key: "svc", label: "Service", type: "checkbox", options: ["Cut", "Colour"] },
  ]);
  eq(svc.type, "checkbox");
  eq(svc.crmField, "custom");
  eq(JSON.stringify(svc.options), JSON.stringify(["Cut", "Colour"]));
});

check("a non-choice field never carries options", () => {
  const [, note] = normalizeFormFields([
    { key: "name", label: "Name" },
    { key: "note", label: "Note", type: "text", options: ["sneaky"] },
  ]);
  eq(note.options.length, 0);
});

check("a relabelled custom field still cannot claim a core CRM column", () => {
  const [, evil] = normalizeFormFields([
    { key: "name", label: "Name" },
    { key: "evil", label: "Evil", type: "text", crmField: "email" },
  ]);
  eq(evil.crmField, "custom");
});

console.log("\n— FAQ —");

check("a fully blank row is dropped, not rejected", () => {
  eq(normalizeFaq([{ question: "", answer: "" }]).length, 0);
});

check("a half-written row is rejected", () => {
  let code = "";
  try {
    normalizeFaq([{ question: "How much?", answer: "" }]);
  } catch (e) {
    code = e.code;
  }
  eq(code, "INCOMPLETE");
});

check("more than the maximum is rejected", () => {
  let code = "";
  try {
    normalizeFaq(Array.from({ length: 9 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` })));
  } catch (e) {
    code = e.code;
  }
  eq(code, "TOO_MANY");
});

console.log("\n— webhook allowlist —");

check("accepts a public https endpoint", () => {
  eq(isAllowedWebhookUrl("https://hooks.example.com/abc"), true);
});

check("rejects plain http", () => {
  eq(isAllowedWebhookUrl("http://hooks.example.com/abc"), false);
});

check("rejects loopback, private ranges and cloud metadata", () => {
  for (const url of [
    "https://localhost/hook",
    "https://127.0.0.1/hook",
    "https://10.0.0.5/hook",
    "https://192.168.1.10/hook",
    "https://172.16.4.4/hook",
    "https://169.254.169.254/latest/meta-data",
    "https://metadata.google.internal/computeMetadata/v1/",
  ]) {
    if (isAllowedWebhookUrl(url)) throw new Error("allowed an internal target: " + url);
  }
});

check("rejects nonsense", () => {
  eq(isAllowedWebhookUrl("not a url"), false);
  eq(isAllowedWebhookUrl(""), false);
});

console.log(`\n${pass} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);

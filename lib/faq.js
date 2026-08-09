// Landing-page FAQ.
//
// Model-free, for the same reason as lib/formFields.js and lib/socialLinks.js:
// the editor is a client component and can't import the Tenant model to learn
// its own limits.

export const MAX_FAQ_ITEMS = 8;
export const MAX_FAQ_QUESTION = 160;
export const MAX_FAQ_ANSWER = 600;

export function blankFaqItem() {
  return { question: "", answer: "" };
}

function faqError(code, message, data) {
  return Object.assign(new Error(message), { code, ...data });
}

/**
 * Validates and normalizes the FAQ list submitted to the landing-page PATCH
 * route. An entry with both halves blank is dropped rather than rejected —
 * the editor always renders one empty row to type into, and a tenant who
 * doesn't want an FAQ shouldn't have to delete it before they can save.
 *
 * Errors carry a stable `code` the API route maps to a localized message;
 * this module has no request context to translate with itself.
 */
export function normalizeFaq(input) {
  if (!Array.isArray(input)) return [];

  const cleaned = [];
  for (const raw of input) {
    const question = String(raw?.question ?? "").trim();
    const answer = String(raw?.answer ?? "").trim();

    if (!question && !answer) continue;
    if (!question || !answer) {
      throw faqError("INCOMPLETE", "Every FAQ entry needs both a question and an answer.");
    }

    cleaned.push({
      question: question.slice(0, MAX_FAQ_QUESTION),
      answer: answer.slice(0, MAX_FAQ_ANSWER),
    });
  }

  if (cleaned.length > MAX_FAQ_ITEMS) {
    throw faqError("TOO_MANY", `You can have at most ${MAX_FAQ_ITEMS} FAQ entries.`, {
      n: MAX_FAQ_ITEMS,
    });
  }

  return cleaned;
}

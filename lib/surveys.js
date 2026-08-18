// Survey question handling, shared by the authoring routes and the public
// submission route.
//
// Framework-free so test/surveys.test.mjs can exercise it directly. The
// asymmetry here is the point: `normalizeQuestions` sanitises what a logged-in
// tenant wrote, while `collectAnswers` sanitises what an anonymous stranger on
// the internet posted. The second is the one that has to be paranoid.

export const QUESTION_TYPES = ["rating", "text"];
export const MAX_SURVEY_QUESTIONS = 3;
export const MAX_SURVEY_TITLE = 120;
export const MAX_QUESTION_LABEL = 200;
export const MAX_ANSWER_TEXT = 2_000;
export const MAX_RESPONDENT_NAME = 80;
export const RATING_MAX = 5;

/**
 * Turns whatever the builder sent into a valid question list, or null.
 *
 * Keys are assigned here rather than accepted from the client: a client-chosen
 * key could collide with an existing one and silently re-point historical
 * answers at a different question.
 */
export function normalizeQuestions(input, existing = []) {
  if (!Array.isArray(input)) return null;

  const questions = [];
  const usedKeys = new Set();

  for (const raw of input.slice(0, MAX_SURVEY_QUESTIONS)) {
    const label = String(raw?.label ?? "").trim().slice(0, MAX_QUESTION_LABEL);
    if (!label) continue;

    const type = QUESTION_TYPES.includes(raw?.type) ? raw.type : "text";

    // An edit keeps the key the answers already reference; only genuinely new
    // questions mint one. `q1`, `q2`, … are stable and readable in exports.
    let key = typeof raw?.key === "string" && existing.some((q) => q.key === raw.key)
      ? raw.key
      : null;
    if (!key || usedKeys.has(key)) {
      let n = 1;
      while (usedKeys.has(`q${n}`) || existing.some((q) => q.key === `q${n}`)) n += 1;
      key = `q${n}`;
    }
    usedKeys.add(key);

    questions.push({ key, type, label, required: raw?.required === true });
  }

  return questions.length ? questions : null;
}

/**
 * Matches a public submission against the survey's own questions.
 *
 * Driven by the stored questions, never by the posted payload: an answer for a
 * key the survey doesn't have is dropped rather than stored, so nobody can
 * append arbitrary fields to a tenant's results by editing the request. Returns
 * `{ answers, missingRequired }`.
 */
export function collectAnswers(questions = [], submitted = {}) {
  const answers = [];
  const missingRequired = [];

  for (const question of questions) {
    const raw = submitted?.[question.key];

    if (question.type === "rating") {
      const rating = Math.round(Number(raw));
      const valid = Number.isFinite(rating) && rating >= 1 && rating <= RATING_MAX;
      if (valid) answers.push({ key: question.key, rating, text: "" });
      else if (question.required) missingRequired.push(question.key);
      continue;
    }

    const text = String(raw ?? "").trim().slice(0, MAX_ANSWER_TEXT);
    if (text) answers.push({ key: question.key, rating: null, text });
    else if (question.required) missingRequired.push(question.key);
  }

  return { answers, missingRequired };
}

/** The mean rating across a survey's stored running totals, or null. */
export function averageRating(survey) {
  const count = Number(survey?.ratingCount) || 0;
  if (count <= 0) return null;
  return Math.round((Number(survey.ratingSum) / count) * 10) / 10;
}

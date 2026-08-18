// Survey question handling. collectAnswers is the one function in this feature
// that processes input from an anonymous stranger, so most of this is about
// what it refuses.
import assert from "node:assert/strict";
import { averageRating, collectAnswers, normalizeQuestions } from "../lib/surveys.js";

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("  ok   " + name); pass++; }
  catch (e) { console.log("  FAIL " + name + "\n        " + e.message); fail++; }
}

console.log("\n— surveys —");

check("questions get stable keys assigned by the server", () => {
  const questions = normalizeQuestions([
    { type: "rating", label: "How was it?" },
    { type: "text", label: "Anything else?" },
  ]);
  assert.deepEqual(questions.map((q) => q.key), ["q1", "q2"]);
});

check("editing a question keeps the key its answers reference", () => {
  const existing = [{ key: "q1", type: "rating", label: "How was it?", required: false }];
  const edited = normalizeQuestions([{ key: "q1", type: "rating", label: "Rate the service" }], existing);
  assert.equal(edited[0].key, "q1");
  assert.equal(edited[0].label, "Rate the service");
});

check("a client-supplied key that isn't already ours is not honoured", () => {
  // Otherwise a crafted key could collide with an existing question and
  // silently re-point historical answers.
  const questions = normalizeQuestions([{ key: "injected", type: "text", label: "Hi" }]);
  assert.equal(questions[0].key, "q1");
});

check("blank labels are dropped and an all-blank survey is rejected", () => {
  assert.equal(normalizeQuestions([{ label: "   " }]), null);
  assert.equal(normalizeQuestions([]), null);
  assert.equal(normalizeQuestions("not an array"), null);
  assert.equal(normalizeQuestions([{ label: "Real" }, { label: "" }]).length, 1);
});

check("an unknown answer type falls back to text rather than being stored", () => {
  assert.equal(normalizeQuestions([{ type: "signature", label: "Sign" }])[0].type, "text");
});

check("no more than three questions survive", () => {
  const many = normalizeQuestions(Array.from({ length: 9 }, (_, i) => ({ label: `Q${i}` })));
  assert.equal(many.length, 3);
});

const questions = [
  { key: "q1", type: "rating", label: "Rate us", required: true },
  { key: "q2", type: "text", label: "Comments", required: false },
];

check("answers are matched against the survey's own questions", () => {
  const { answers, missingRequired } = collectAnswers(questions, { q1: 4, q2: " great " });
  assert.deepEqual(missingRequired, []);
  assert.deepEqual(answers, [
    { key: "q1", rating: 4, text: "" },
    { key: "q2", rating: null, text: "great" },
  ]);
});

check("an answer for a key the survey doesn't have is discarded", () => {
  // The loop is driven by the stored questions, so nobody can append fields to
  // a tenant's results by editing the request body.
  const { answers } = collectAnswers(questions, { q1: 5, isAdmin: true, q99: "injected" });
  assert.deepEqual(answers.map((a) => a.key), ["q1"]);
});

check("a rating outside 1–5 is refused, not clamped", () => {
  for (const bad of [0, 6, -3, "five", null, NaN]) {
    const { answers, missingRequired } = collectAnswers(questions, { q1: bad });
    assert.deepEqual(answers, [], String(bad));
    assert.deepEqual(missingRequired, ["q1"], String(bad));
  }
});

check("a fractional rating rounds to a whole star", () => {
  assert.equal(collectAnswers(questions, { q1: 4.4 }).answers[0].rating, 4);
});

check("a missing required answer is reported, an optional one isn't", () => {
  const { missingRequired } = collectAnswers(questions, { q2: "only a comment" });
  assert.deepEqual(missingRequired, ["q1"]);
});

check("whitespace is not an answer", () => {
  const required = [{ key: "q1", type: "text", label: "Why?", required: true }];
  assert.deepEqual(collectAnswers(required, { q1: "   " }).missingRequired, ["q1"]);
});

check("the average rating is null until there is one", () => {
  assert.equal(averageRating({ ratingSum: 0, ratingCount: 0 }), null);
  assert.equal(averageRating(undefined), null);
  assert.equal(averageRating({ ratingSum: 9, ratingCount: 2 }), 4.5);
  assert.equal(averageRating({ ratingSum: 10, ratingCount: 3 }), 3.3);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

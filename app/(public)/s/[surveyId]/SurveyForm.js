"use client";

import { useState } from "react";
import { RATING_MAX } from "@/lib/surveys";
import { IconStar } from "@/components/icons";
import styles from "./page.module.css";

/**
 * The answer form.
 *
 * A client component only because it posts and shows a result — the questions
 * themselves are rendered on the server, so someone with JavaScript disabled
 * at least sees what they were asked. `labels` is passed in rather than read
 * from a translation hook: this page sits outside the localised tree and has
 * no LocaleProvider (see the note in page.js).
 */
export default function SurveyForm({ surveyId, questions, labels }) {
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState("");
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (state === "sending") return;

    const missing = questions.filter((q) => q.required && !answers[q.key]);
    if (missing.length) {
      setError(labels.required);
      return;
    }

    setState("sending");
    setError("");
    try {
      const res = await fetch(`/api/survey-response/${surveyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondentName: name, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || labels.failed);
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p className={styles.thanks} role="status">
        {labels.thanks}
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {questions.map((question) => (
        <fieldset key={question.key} className={styles.question}>
          <legend className={styles.questionLabel}>
            {question.label}
            {question.required && <span aria-hidden="true"> *</span>}
          </legend>

          {question.type === "rating" ? (
            // Radio inputs rather than clickable spans, so the whole scale is
            // one keyboard-navigable group and a screen reader announces which
            // value is selected out of how many.
            <div className={styles.rating} role="radiogroup" aria-label={question.label}>
              {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((value) => (
                <label
                  key={value}
                  className={styles.ratingOption}
                  data-selected={Number(answers[question.key]) >= value}
                >
                  <input
                    type="radio"
                    name={question.key}
                    value={value}
                    className={styles.ratingInput}
                    checked={Number(answers[question.key]) === value}
                    onChange={() => setAnswers({ ...answers, [question.key]: value })}
                    aria-label={labels.ratingLabel.replace("{n}", String(value))}
                    required={question.required}
                  />
                  <IconStar size={26} />
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className={styles.textInput}
              rows={3}
              maxLength={2000}
              value={answers[question.key] ?? ""}
              onChange={(event) =>
                setAnswers({ ...answers, [question.key]: event.target.value })
              }
              aria-label={question.label}
              required={question.required}
            />
          )}
        </fieldset>
      ))}

      <input
        className={styles.nameInput}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={labels.namePlaceholder}
        aria-label={labels.namePlaceholder}
        maxLength={80}
      />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={state === "sending"}>
        {state === "sending" ? labels.sending : labels.submit}
      </button>
    </form>
  );
}

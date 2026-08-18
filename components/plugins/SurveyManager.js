"use client";

import { useCallback, useMemo, useState } from "react";
import { MAX_SURVEY_QUESTIONS, RATING_MAX, averageRating } from "@/lib/surveys";
import { whatsappShareUrl } from "@/lib/socialLinks";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import {
  IconCheck,
  IconCopy,
  IconPlus,
  IconStar,
  IconTrash,
  IconWhatsApp,
} from "@/components/icons";
import styles from "./plugins.module.css";
import dash from "@/components/dashboard.module.css";

function blankQuestion(index) {
  return { key: "", type: index === 0 ? "rating" : "text", label: "", required: false };
}

export default function SurveyManager({ initialSurveys = [], appUrl = "" }) {
  const t = useT();
  const { locale } = useLocale();

  const [surveys, setSurveys] = useState(initialSurveys);
  const [draft, setDraft] = useState({
    title: "",
    intro: "",
    questions: [blankQuestion(0)],
  });
  const [openResponses, setOpenResponses] = useState(null);
  const [responses, setResponses] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale]
  );

  const request = useCallback(
    async (url, options) => {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("surveys.saveFailed"));
      return data;
    },
    [t]
  );

  // The public link. Built from the app's own origin at render time rather
  // than stored on the survey, so a deployment that moves domain doesn't leave
  // every previously created survey pointing at the old one.
  const linkFor = useCallback(
    (survey) => {
      const origin = appUrl || (typeof window === "undefined" ? "" : window.location.origin);
      return `${origin}/s/${survey._id}`;
    },
    [appUrl]
  );

  async function createSurvey(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await request("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setSurveys((current) => [data.survey, ...current]);
      setDraft({ title: "", intro: "", questions: [blankQuestion(0)] });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleOpen(survey) {
    const previous = surveys;
    setSurveys((current) =>
      current.map((row) => (row._id === survey._id ? { ...row, open: !row.open } : row))
    );
    setError("");
    try {
      await request(`/api/surveys/${survey._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: !survey.open }),
      });
    } catch (err) {
      setSurveys(previous);
      setError(err.message);
    }
  }

  async function removeSurvey(survey) {
    const previous = surveys;
    setSurveys((current) => current.filter((row) => row._id !== survey._id));
    if (openResponses === survey._id) setOpenResponses(null);
    setError("");
    try {
      await request(`/api/surveys/${survey._id}`, { method: "DELETE" });
    } catch (err) {
      setSurveys(previous);
      setError(err.message);
    }
  }

  async function showResponses(survey) {
    if (openResponses === survey._id) {
      setOpenResponses(null);
      return;
    }
    setError("");
    try {
      const data = await request(`/api/surveys/${survey._id}/responses`);
      setResponses(data.responses);
      setOpenResponses(survey._id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyLink(survey) {
    try {
      await navigator.clipboard.writeText(linkFor(survey));
      setCopiedId(survey._id);
      setTimeout(() => setCopiedId((id) => (id === survey._id ? null : id)), 1600);
    } catch {
      setError(t("surveys.copyFailed"));
    }
  }

  function updateQuestion(index, patch) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));
  }

  const activeSurvey = surveys.find((s) => s._id === openResponses);

  return (
    <div className={styles.toolPage}>
      <form className={styles.surveyBuilder} onSubmit={createSurvey}>
        <h2 className={dash.sectionTitle}>{t("surveys.newTitle")}</h2>

        <input
          className={styles.composerInput}
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          placeholder={t("surveys.titlePlaceholder")}
          aria-label={t("surveys.title")}
          maxLength={120}
        />
        <input
          className={styles.composerInput}
          value={draft.intro}
          onChange={(event) => setDraft({ ...draft, intro: event.target.value })}
          placeholder={t("surveys.introPlaceholder")}
          aria-label={t("surveys.intro")}
          maxLength={200}
        />

        {draft.questions.map((question, index) => (
          <div key={index} className={styles.questionRow}>
            <input
              className={styles.composerInput}
              value={question.label}
              onChange={(event) => updateQuestion(index, { label: event.target.value })}
              placeholder={t("surveys.questionPlaceholder", { n: index + 1 })}
              aria-label={t("surveys.questionPlaceholder", { n: index + 1 })}
              maxLength={200}
            />
            <select
              className={styles.composerSelect}
              value={question.type}
              onChange={(event) => updateQuestion(index, { type: event.target.value })}
              aria-label={t("surveys.questionType")}
            >
              <option value="rating">{t("surveys.typeRating")}</option>
              <option value="text">{t("surveys.typeText")}</option>
            </select>
            <label className={styles.inlineCheck}>
              <input
                type="checkbox"
                checked={question.required}
                onChange={(event) => updateQuestion(index, { required: event.target.checked })}
              />
              {t("surveys.required")}
            </label>
          </div>
        ))}

        <div className={styles.builderActions}>
          {draft.questions.length < MAX_SURVEY_QUESTIONS && (
            <button
              type="button"
              className={dash.linkButton}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  questions: [...current.questions, blankQuestion(current.questions.length)],
                }))
              }
            >
              <IconPlus size={15} />
              {t("surveys.addQuestion")}
            </button>
          )}
          <button
            type="submit"
            className={dash.saveButton}
            disabled={busy || !draft.title.trim() || !draft.questions.some((q) => q.label.trim())}
          >
            {t("surveys.create")}
          </button>
        </div>
      </form>

      {error && (
        <p className={dash.formError} role="alert">
          {error}
        </p>
      )}

      {surveys.length === 0 ? (
        <p className={dash.empty}>{t("surveys.empty")}</p>
      ) : (
        <ul className={styles.surveyList}>
          {surveys.map((survey) => {
            const average = averageRating(survey);
            return (
              <li key={survey._id} className={styles.surveyCard}>
                <div className={styles.surveyHeader}>
                  <h3 className={styles.surveyTitle}>{survey.title}</h3>
                  <span className={styles.statusChip} data-open={survey.open}>
                    {survey.open ? t("surveys.open") : t("surveys.closed")}
                  </span>
                </div>

                <p className={styles.surveyStats}>
                  <span>{t("surveys.responseCount", { count: survey.responseCount ?? 0 })}</span>
                  {average !== null && (
                    <span className={styles.ratingSummary}>
                      <IconStar size={14} />
                      {average} / {RATING_MAX}
                    </span>
                  )}
                </p>

                {/*
                  The link is shown, not just copyable: people paste these into
                  a message by hand as often as they use a button, and a link
                  you can't see is one you can't check before sending.
                  dir="ltr" keeps a URL readable inside a Hebrew page.
                */}
                <code className={styles.linkBox} dir="ltr">
                  {linkFor(survey)}
                </code>

                <div className={styles.snippetActions}>
                  <button type="button" className={dash.linkButton} onClick={() => copyLink(survey)}>
                    {copiedId === survey._id ? <IconCheck size={15} /> : <IconCopy size={15} />}
                    {copiedId === survey._id ? t("surveys.copied") : t("surveys.copyLink")}
                  </button>

                  <a
                    className={dash.whatsappButton}
                    href={whatsappShareUrl(`${survey.title}\n${linkFor(survey)}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconWhatsApp size={15} />
                    {t("surveys.share")}
                  </a>

                  <button
                    type="button"
                    className={dash.linkButton}
                    onClick={() => showResponses(survey)}
                    aria-expanded={openResponses === survey._id}
                  >
                    {t("surveys.viewResponses")}
                  </button>

                  <button
                    type="button"
                    className={dash.linkButton}
                    onClick={() => toggleOpen(survey)}
                  >
                    {survey.open ? t("surveys.close") : t("surveys.reopen")}
                  </button>

                  <button
                    type="button"
                    className={dash.iconButton}
                    onClick={() => removeSurvey(survey)}
                    aria-label={`${t("common.delete")}: ${survey.title}`}
                    title={t("common.delete")}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>

                {openResponses === survey._id && (
                  <div className={styles.responseList}>
                    {responses.length === 0 ? (
                      <p className={dash.empty}>{t("surveys.noResponses")}</p>
                    ) : (
                      responses.map((response, index) => (
                        <article key={index} className={styles.responseCard}>
                          <header className={styles.responseHeader}>
                            <strong>{response.respondentName || t("surveys.anonymous")}</strong>
                            <time dateTime={response.createdAt}>
                              {dateFormatter.format(new Date(response.createdAt))}
                            </time>
                          </header>
                          {response.answers.map((answer) => {
                            const question = activeSurvey?.questions?.find(
                              (q) => q.key === answer.key
                            );
                            return (
                              <p key={answer.key} className={styles.responseAnswer}>
                                <span className={styles.responseQuestion}>
                                  {question?.label || answer.key}
                                </span>
                                <span>
                                  {typeof answer.rating === "number"
                                    ? `${answer.rating} / ${RATING_MAX}`
                                    : answer.text}
                                </span>
                              </p>
                            );
                          })}
                        </article>
                      ))
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

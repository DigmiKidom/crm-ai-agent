"use client";

import { useCallback, useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { CONTENT_LANGUAGES, isRtlLanguage } from "@/lib/i18n/languages";
import { MAX_EDUCATION, MAX_EXPERIENCE, MAX_SKILLS, MAX_BULLETS } from "@/lib/resumeLimits";
import ResumePreview from "./ResumePreview";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconClose,
  IconDownload,
  IconGraduation,
  IconPlus,
  IconSparkles,
  IconUser,
} from "@/components/icons";
import styles from "./resume.module.css";

const STEPS = [
  { key: "s1", Icon: IconUser },
  { key: "s2", Icon: IconBriefcase },
  { key: "s3", Icon: IconGraduation },
  { key: "s4", Icon: IconCheck },
  { key: "s5", Icon: IconSparkles },
];

const emptyRole = () => ({
  role: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  current: false,
  bullets: [""],
});
const emptyEducation = () => ({
  institution: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
  note: "",
});

export default function ResumeBuilder({ initialResume }) {
  const t = useT();
  const printRef = useRef(null);

  const [resume, setResume] = useState(initialResume);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [aiBusy, setAiBusy] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [skillDraft, setSkillDraft] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const set = useCallback((patch) => {
    setResume((r) => ({ ...r, ...patch }));
    setSaved(false);
  }, []);

  // ── list helpers ────────────────────────────────────────────────────────
  const updateAt = (key, index, patch) =>
    set({ [key]: (resume[key] ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const removeAt = (key, index) =>
    set({ [key]: (resume[key] ?? []).filter((_, i) => i !== index) });

  function addSkill(raw) {
    const value = raw.trim();
    if (!value) return;
    // Case-insensitive dedupe: "React" and "react" on one CV looks careless.
    const exists = (resume.skills ?? []).some((s) => s.toLowerCase() === value.toLowerCase());
    if (exists || resume.skills.length >= MAX_SKILLS) {
      setSkillDraft("");
      return;
    }
    set({ skills: [...resume.skills, value] });
    setSkillDraft("");
  }

  // ── persistence ─────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("cv.saveFailed"));
        return;
      }
      setResume(data.resume);
      setSaved(true);
    } catch {
      setError(t("cv.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function runAgent(action) {
    setAiBusy(action);
    setError("");
    setAiNote("");
    try {
      const res = await fetch("/api/resume/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resume, language: resume.language?.code || "auto" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("cv.aiFailed"));
        return;
      }

      const s = data.suggestion;
      const patch = { summary: s.summary || resume.summary, language: s.language };
      if (action === "summarize" && s.headline) patch.headline = s.headline;
      if (action === "polish" && Array.isArray(s.experience)) {
        // Merged by index — the agent is told not to reorder, and the API
        // clamps the array to the length we sent.
        patch.experience = (resume.experience ?? []).map((role, i) => ({
          ...role,
          bullets: s.experience[i]?.bullets?.length ? s.experience[i].bullets : role.bullets,
        }));
      }
      set(patch);
      setAiNote(t("cv.aiApplied"));
    } catch {
      setError(t("cv.aiFailed"));
    } finally {
      setAiBusy("");
    }
  }

  // Print-to-PDF. No library: the preview element IS the printed page (see
  // resume.module.css), so the export can't drift from what's on screen.
  const handleExport = useCallback(() => window.print(), []);

  // Relative for display (safe during SSR — `window` doesn't exist there);
  // resolved to absolute only inside the click handler below, which by
  // definition never runs on the server.
  const publicPath = resume._id ? `/cv/${resume._id}` : "";

  async function handleCopyLink() {
    if (!publicPath) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
      setLinkCopied(true);
    } catch {
      setError(t("cv.copyLinkFailed"));
    }
  }

  const docDir = resume.language?.dir === "rtl" ? "rtl" : "ltr";
  // Defensive on `bullets`: a document saved before the field existed, or one
  // hand-edited in the database, would otherwise throw on `.some` of undefined
  // and take the whole page down.
  const canPolish =
    (resume.experience ?? []).some((r) => (r.bullets ?? []).some(Boolean)) ||
    Boolean(resume.summary);
  const isLast = step === STEPS.length - 1;

  // A plain function, not useMemo: every handler it closes over is recreated
  // each render, so memoizing would either be a no-op or — with a hand-written
  // dependency list — silently render a stale step. The switch is cheap.
  function renderStep() {
    switch (step) {
      // ── 1. Details ──────────────────────────────────────────────────────
      case 0:
        return (
          <div className={styles.fieldGrid}>
            <Field label={t("cv.fullName")} id="cv-name">
              <input
                id="cv-name"
                value={resume.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
              />
            </Field>
            <Field label={t("cv.headline")} id="cv-headline">
              <input
                id="cv-headline"
                placeholder={t("cv.headlinePlaceholder")}
                value={resume.headline}
                onChange={(e) => set({ headline: e.target.value })}
              />
            </Field>
            <Field label={t("cv.email")} id="cv-email">
              <input
                id="cv-email"
                type="email"
                dir="ltr"
                value={resume.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </Field>
            <Field label={t("cv.phone")} id="cv-phone">
              <input
                id="cv-phone"
                type="tel"
                dir="ltr"
                value={resume.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </Field>
            <Field label={t("cv.location")} id="cv-location">
              <input
                id="cv-location"
                placeholder={t("cv.locationPlaceholder")}
                value={resume.location}
                onChange={(e) => set({ location: e.target.value })}
              />
            </Field>
            <Field label={t("cv.website")} id="cv-website">
              <input
                id="cv-website"
                dir="ltr"
                value={resume.website}
                onChange={(e) => set({ website: e.target.value })}
              />
            </Field>
            <Field label={t("cv.linkedin")} id="cv-linkedin">
              <input
                id="cv-linkedin"
                dir="ltr"
                value={resume.linkedin}
                onChange={(e) => set({ linkedin: e.target.value })}
              />
            </Field>
            <Field label={t("cv.documentLanguage")} id="cv-language">
              <select
                id="cv-language"
                value={resume.language?.code || "en"}
                onChange={(e) =>
                  set({
                    language: {
                      code: e.target.value,
                      dir: isRtlLanguage(e.target.value) ? "rtl" : "ltr",
                    },
                  })
                }
              >
                {CONTENT_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code === "en" ? l.name : `${l.nativeName} · ${l.name}`}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        );

      // ── 2. Experience ───────────────────────────────────────────────────
      case 1:
        return (
          <div className={styles.repeatList}>
            {resume.experience.map((role, i) => (
              <fieldset key={i} className={styles.repeatItem}>
                <legend className={styles.repeatLegend}>
                  {t("cv.roleN", { n: i + 1 })}
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeAt("experience", i)}
                    aria-label={t("cv.removeRole")}
                    title={t("cv.removeRole")}
                  >
                    <IconClose size={14} />
                  </button>
                </legend>

                <div className={styles.fieldGrid}>
                  <Field label={t("cv.role")}>
                    <input
                      value={role.role}
                      onChange={(e) => updateAt("experience", i, { role: e.target.value })}
                    />
                  </Field>
                  <Field label={t("cv.company")}>
                    <input
                      value={role.company}
                      onChange={(e) => updateAt("experience", i, { company: e.target.value })}
                    />
                  </Field>
                  <Field label={t("cv.from")}>
                    <input
                      value={role.startDate}
                      onChange={(e) => updateAt("experience", i, { startDate: e.target.value })}
                    />
                  </Field>
                  <Field label={t("cv.to")}>
                    <input
                      value={role.endDate}
                      disabled={role.current}
                      onChange={(e) => updateAt("experience", i, { endDate: e.target.value })}
                    />
                  </Field>
                </div>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={role.current}
                    onChange={(e) =>
                      // Clearing endDate here keeps the preview from rendering
                      // "2021 – 2023 – Present".
                      updateAt("experience", i, {
                        current: e.target.checked,
                        endDate: e.target.checked ? "" : role.endDate,
                      })
                    }
                  />
                  <span>{t("cv.current")}</span>
                </label>

                <div className={styles.bulletBlock}>
                  <span className={styles.fieldLabel}>{t("cv.bullets")}</span>
                  {role.bullets.map((b, bi) => (
                    <div key={bi} className={styles.bulletRow}>
                      <textarea
                        rows={2}
                        placeholder={t("cv.bulletPlaceholder")}
                        value={b}
                        onChange={(e) =>
                          updateAt("experience", i, {
                            bullets: role.bullets.map((x, xi) => (xi === bi ? e.target.value : x)),
                          })
                        }
                      />
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() =>
                          updateAt("experience", i, {
                            bullets: role.bullets.filter((_, xi) => xi !== bi),
                          })
                        }
                        aria-label={t("common.delete")}
                      >
                        <IconClose size={13} />
                      </button>
                    </div>
                  ))}
                  {role.bullets.length < MAX_BULLETS && (
                    <button
                      type="button"
                      className={styles.ghostAdd}
                      onClick={() => updateAt("experience", i, { bullets: [...role.bullets, ""] })}
                    >
                      <IconPlus size={13} /> {t("cv.addBullet")}
                    </button>
                  )}
                </div>
              </fieldset>
            ))}

            {resume.experience.length < MAX_EXPERIENCE && (
              <button
                type="button"
                className={styles.addButton}
                onClick={() => set({ experience: [...resume.experience, emptyRole()] })}
              >
                <IconPlus size={14} /> {t("cv.addRole")}
              </button>
            )}
          </div>
        );

      // ── 3. Education ────────────────────────────────────────────────────
      case 2:
        return (
          <div className={styles.repeatList}>
            {resume.education.map((e, i) => (
              <fieldset key={i} className={styles.repeatItem}>
                <legend className={styles.repeatLegend}>
                  {t("cv.educationN", { n: i + 1 })}
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeAt("education", i)}
                    aria-label={t("cv.removeEducation")}
                    title={t("cv.removeEducation")}
                  >
                    <IconClose size={14} />
                  </button>
                </legend>
                <div className={styles.fieldGrid}>
                  <Field label={t("cv.institution")}>
                    <input
                      value={e.institution}
                      onChange={(ev) => updateAt("education", i, { institution: ev.target.value })}
                    />
                  </Field>
                  <Field label={t("cv.degree")}>
                    <input
                      value={e.degree}
                      onChange={(ev) => updateAt("education", i, { degree: ev.target.value })}
                    />
                  </Field>
                  <Field label={t("cv.field")}>
                    <input
                      value={e.field}
                      onChange={(ev) => updateAt("education", i, { field: ev.target.value })}
                    />
                  </Field>
                  <Field label={t("cv.note")}>
                    <input
                      value={e.note}
                      onChange={(ev) => updateAt("education", i, { note: ev.target.value })}
                    />
                  </Field>
                  <Field label={t("cv.from")}>
                    <input
                      value={e.startDate}
                      onChange={(ev) => updateAt("education", i, { startDate: ev.target.value })}
                    />
                  </Field>
                  <Field label={t("cv.to")}>
                    <input
                      value={e.endDate}
                      onChange={(ev) => updateAt("education", i, { endDate: ev.target.value })}
                    />
                  </Field>
                </div>
              </fieldset>
            ))}

            {resume.education.length < MAX_EDUCATION && (
              <button
                type="button"
                className={styles.addButton}
                onClick={() => set({ education: [...resume.education, emptyEducation()] })}
              >
                <IconPlus size={14} /> {t("cv.addEducation")}
              </button>
            )}
          </div>
        );

      // ── 4. Skills ───────────────────────────────────────────────────────
      case 3:
        return (
          <div>
            <span className={styles.fieldLabel}>{t("cv.skills")}</span>
            <p className={styles.stepHint}>{t("cv.skillsHint")}</p>

            <div className={styles.chipRow}>
              {resume.skills.map((s) => (
                <span key={s} className={styles.chip}>
                  {s}
                  <button
                    type="button"
                    onClick={() => set({ skills: resume.skills.filter((x) => x !== s) })}
                    aria-label={t("cv.removeSkill", { skill: s })}
                  >
                    <IconClose size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div className={styles.skillInputRow}>
              <input
                value={skillDraft}
                placeholder={t("cv.addSkill")}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter would submit the surrounding form and navigate away.
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addSkill(skillDraft);
                  }
                }}
                onBlur={() => addSkill(skillDraft)}
              />
              <button type="button" className={styles.ghostAdd} onClick={() => addSkill(skillDraft)}>
                <IconPlus size={13} /> {t("cv.addSkill")}
              </button>
            </div>
          </div>
        );

      // ── 5. Summary ──────────────────────────────────────────────────────
      default:
        return (
          <div>
            <Field label={t("cv.summary")} id="cv-summary">
              <textarea
                id="cv-summary"
                rows={6}
                maxLength={1200}
                value={resume.summary}
                onChange={(e) => set({ summary: e.target.value })}
              />
            </Field>
            <p className={styles.stepHint}>{t("cv.summaryHint")}</p>

            <div className={styles.aiRow}>
              <button
                type="button"
                className={styles.aiButton}
                onClick={() => runAgent("summarize")}
                disabled={Boolean(aiBusy) || !canPolish}
              >
                <IconSparkles size={14} />
                {aiBusy === "summarize" ? t("cv.aiWorking") : t("cv.aiSummarize")}
              </button>
              <button
                type="button"
                className={styles.aiButton}
                onClick={() => runAgent("polish")}
                disabled={Boolean(aiBusy) || !canPolish}
              >
                <IconSparkles size={14} />
                {aiBusy === "polish" ? t("cv.aiWorking") : t("cv.aiPolish")}
              </button>
            </div>
            {!canPolish && <p className={styles.stepHint}>{t("cv.aiNothing")}</p>}
            {aiNote && (
              <p className={styles.aiNote} role="status">
                {aiNote}
              </p>
            )}
          </div>
        );
    }
  }

  return (
    <div className={styles.builder}>
      <div className={styles.editorPane}>
        <nav className={styles.stepNav} aria-label={t("cv.steps")}>
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={styles.stepNavItem}
              data-active={i === step || undefined}
              data-done={i < step || undefined}
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
            >
              <s.Icon size={15} />
              <span>{t(`cv.${s.key}`)}</span>
            </button>
          ))}
        </nav>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.stepPanel}>
          <p className={styles.stepCounter}>
            {t("cv.stepOf", { n: step + 1, total: STEPS.length })}
          </p>
          {renderStep()}
        </div>

        <div className={styles.stepActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            {/* Arrows point along the reading direction — see globals.css. */}
            <IconArrowLeft size={14} className="dirFlip" />
            {t("cv.back")}
          </button>

          {!isLast ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              {t("cv.next")}
              <IconArrowRight size={14} className="dirFlip" />
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
          )}

          {saved && (
            <span className={styles.savedNote} role="status">
              {t("settings.saved")}
            </span>
          )}
        </div>
      </div>

      <aside className={styles.previewPane} dir={docDir}>
        <div className={styles.previewBar}>
          <h2 className={styles.previewTitle}>{t("cv.preview")}</h2>
          <button type="button" className={styles.exportButton} onClick={handleExport}>
            <IconDownload size={14} />
            {t("cv.exportPdf")}
          </button>
        </div>
        <p className={styles.exportHint}>{t("cv.exportHint")}</p>

        <div className={styles.shareBlock}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={Boolean(resume.isPublic)}
              onChange={(e) => set({ isPublic: e.target.checked })}
            />
            <span>{t("cv.makePublic")}</span>
          </label>
          <p className={styles.exportHint}>{t("cv.makePublicHint")}</p>

          {resume.isPublic && (
            <>
              {publicPath ? (
                <div className={styles.shareLinkRow}>
                  <input type="text" readOnly value={publicPath} className={styles.shareLinkInput} />
                  <button type="button" className={styles.exportButton} onClick={handleCopyLink}>
                    {linkCopied ? t("cv.linkCopied") : t("cv.copyLink")}
                  </button>
                </div>
              ) : (
                <p className={styles.exportHint}>{t("cv.saveToShare")}</p>
              )}
            </>
          )}
        </div>

        <div className={styles.previewSheet}>
          <ResumePreview resume={resume} printRef={printRef} />
        </div>
      </aside>
    </div>
  );
}

function Field({ label, id, children }) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

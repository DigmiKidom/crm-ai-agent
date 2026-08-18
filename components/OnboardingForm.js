"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import PillGroup from "./PillGroup";
import CheckboxGroup from "./CheckboxGroup";
import ColorSwatchGroup from "./ColorSwatchGroup";
import { IconSparkles, IconArrowRight, IconExternalLink, IconOverview } from "./icons";
import { AUTO_LANGUAGE, CONTENT_LANGUAGES } from "@/lib/i18n/languages";
import { COMPANY_SIZES, DEFAULT_COMPANY_SIZE } from "@/lib/companySize";
import {
  TONE_VALUES,
  PERSONALITY_VALUES,
  STYLE_VALUES,
  AUDIENCE_VALUES,
  TECH_VALUES,
  DEFAULT_AGENT_PREFERENCES,
} from "@/lib/agentPreferences";
import { useT } from "@/components/i18n/LocaleProvider";
import plugin from "@/components/plugins/plugins.module.css";
import Link from "@/components/i18n/Link";

// "Auto" first and default: it matches what people actually do — they type
// their answers in their own language and expect a page in that language.
// The explicit options exist for the case where those differ, e.g. an
// Israeli founder describing the business in Hebrew but selling in English.
// Option VALUES live in lib/agentPreferences.js, shared with the Tenant
// schema and Settings' Brand Voice section — these are sent to the agent and
// persisted, so they must stay stable English keys regardless of UI
// language; only the visible label is translated, at render time.

const COLOR_VALUES = [
  { value: "#2563eb", key: "blue" },
  { value: "#16a34a", key: "green" },
  { value: "#7c3aed", key: "purple" },
  { value: "#dc2626", key: "red" },
  { value: "#ea580c", key: "orange" },
  { value: "#0d9488", key: "teal" },
  { value: "#db2777", key: "pink" },
  { value: "#111827", key: "black" },
];

export default function OnboardingForm({ tenantSlug, initial }) {
  const t = useT();

  // Rebuilt each render so the labels follow the active language.
  const opts = (values, ns) => values.map((v) => ({ value: v, label: t(`onboarding.${ns}.${v}`) }));
  // Descriptive tiers rather than headcount ranges — the hint carries the
  // rough team size so the label can stay a self-description.
  const COMPANY_SIZE_OPTIONS = COMPANY_SIZES.map((size) => ({
    value: size.value,
    label: t(`companySize.${size.value}`),
  }));
  const TONE_OPTIONS = opts(TONE_VALUES, "toneOpt");
  const PERSONALITY_OPTIONS = opts(PERSONALITY_VALUES, "personalityOpt");
  const STYLE_OPTIONS = opts(STYLE_VALUES, "styleOpt");
  const TARGET_AUDIENCE_OPTIONS = opts(AUDIENCE_VALUES, "audienceOpt");
  const TECHNOLOGY_OPTIONS = opts(TECH_VALUES, "techOpt");
  const COLOR_OPTIONS = COLOR_VALUES.map((c) => ({
    value: c.value,
    label: t(`onboarding.colorOpt.${c.key}`),
  }));
  const LANGUAGE_OPTIONS = [
    { value: AUTO_LANGUAGE, label: t("onboarding.langAuto") },
    ...CONTENT_LANGUAGES.map((l) => ({
      value: l.code,
      // Native name first: someone looking for Hebrew scans for "עברית".
      label: l.code === "en" ? l.name : `${l.nativeName} · ${l.name}`,
    })),
  ];

  // A rerun of "AI Setup" prefills from what's already persisted on the
  // Tenant (see app/t/[tenantSlug]/onboarding/page.js) rather than resetting
  // every field — leadDefinition and language are the two exceptions: they
  // aren't persisted (a lead definition is a one-off description, not a
  // tunable brand-voice knob), so those always start blank/auto.
  const [form, setForm] = useState({
    industry: initial?.industry || "",
    companySize: initial?.companySize || DEFAULT_COMPANY_SIZE,
    leadDefinition: "",
    tone: initial?.tone || DEFAULT_AGENT_PREFERENCES.tone,
    personality: initial?.personality?.length ? initial.personality : DEFAULT_AGENT_PREFERENCES.personality,
    style: initial?.style || DEFAULT_AGENT_PREFERENCES.style,
    targetAudience: initial?.targetAudience?.length
      ? initial.targetAudience
      : DEFAULT_AGENT_PREFERENCES.targetAudience,
    technology: initial?.technology || DEFAULT_AGENT_PREFERENCES.technology,
    language: AUTO_LANGUAGE,
    brandColor: initial?.brandColor || "#2563eb",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Remaining AI design generations for this business today. `null` while it is
  // still being fetched, so the badge can stay out of the way rather than
  // flashing a wrong number — and so a failed fetch never disables the button
  // on a guess. The server is the only thing that actually enforces the limit
  // (app/api/agent/generate/route.js); this is the courtesy of saying so before
  // someone fills in a long form.
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agent/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) setUsage(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const exhausted = usage ? usage.remaining <= 0 : false;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/agent/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: t("onboarding.serverError") };
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error || t("common.error"));
      // A 429 carries the current counter, so the badge and the button catch up
      // even when the block came from another member of the team generating
      // while this form was open.
      if (typeof data.remaining === "number") {
        setUsage({ used: data.used, remaining: data.remaining, limit: data.limit });
      }
      return;
    }

    if (typeof data.remaining === "number") {
      setUsage({ used: data.used, remaining: data.remaining, limit: data.limit });
    }
    setResult(data);
  }

  if (result) {
    return (
      <div className={styles.detailCard}>
        <p style={{ marginBottom: 16 }}>
          {t("onboarding.doneWithTemplate")}
          {result.templateName ? ` — ${result.templateName}` : ""}
          {result.language?.name ? `, written in ${result.language.name}` : ""}.
        </p>
        <div className={styles.actionsRow} style={{ marginTop: 0 }}>
          <a className={`${styles.saveButton} ${styles.iconLabel}`} href={`/pages/${tenantSlug}`} target="_blank" rel="noreferrer">
            <IconExternalLink size={14} />
            {t("onboarding.viewLandingPage")}
          </a>
          <Link
            className={`${styles.deleteButton} ${styles.iconLabel}`}
            style={{ color: "inherit", borderColor: "var(--border)" }}
            href={`/t/${tenantSlug}`}
          >
            <IconOverview size={14} />
            {t("onboarding.goToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.detailCard} onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
      {error && (
        <p style={{ color: "var(--danger-strong)", marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>{t("onboarding.aboutBusiness")}</div>

        <div className={styles.detailField}>
          <label htmlFor="industry">{t("onboarding.industry")}</label>
          <input
            id="industry"
            required
            placeholder={t("onboarding.industryPlaceholder")}
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.companySize")}</label>
          <PillGroup
            ariaLabel={t("onboarding.companySize")}
            options={COMPANY_SIZE_OPTIONS}
            value={form.companySize}
            onChange={(v) => update("companySize", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.pageLanguage")}</label>
          <div className={styles.formSectionHint} style={{ marginBottom: 8 }}>
            {t("onboarding.pageLanguageHint")}
          </div>
          <PillGroup
            ariaLabel={t("onboarding.pageLanguage")}
            options={LANGUAGE_OPTIONS}
            value={form.language}
            onChange={(v) => update("language", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="leadDefinition">{t("onboarding.leadDefinition")}</label>
          <textarea
            id="leadDefinition"
            required
            rows={3}
            placeholder={t("onboarding.leadDefinitionPlaceholder")}
            value={form.leadDefinition}
            onChange={(e) => update("leadDefinition", e.target.value)}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>{t("onboarding.brandVoice")}</div>
        <div className={styles.formSectionHint}>
          {t("onboarding.brandVoiceHint")}
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.tone")}</label>
          <PillGroup
            ariaLabel={t("onboarding.tone")}
            options={TONE_OPTIONS}
            value={form.tone}
            onChange={(v) => update("tone", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.personalityLabel")}</label>
          <CheckboxGroup
            ariaLabel={t("onboarding.personality")}
            options={PERSONALITY_OPTIONS}
            values={form.personality}
            onChange={(v) => update("personality", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.visualStyle")}</label>
          <PillGroup
            ariaLabel={t("onboarding.visualStyle")}
            options={STYLE_OPTIONS}
            value={form.style}
            onChange={(v) => update("style", v)}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>{t("onboarding.audienceTech")}</div>

        <div className={styles.detailField}>
          <label>{t("onboarding.targetAudienceLabel")}</label>
          <CheckboxGroup
            ariaLabel={t("onboarding.targetAudience")}
            options={TARGET_AUDIENCE_OPTIONS}
            values={form.targetAudience}
            onChange={(v) => update("targetAudience", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.technologyLabel")}</label>
          <PillGroup
            ariaLabel={t("onboarding.technology")}
            options={TECHNOLOGY_OPTIONS}
            value={form.technology}
            onChange={(v) => update("technology", v)}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>{t("onboarding.brandColor")}</div>

        <div className={styles.detailField}>
          <ColorSwatchGroup
            ariaLabel={t("onboarding.preferredColor")}
            options={COLOR_OPTIONS}
            value={form.brandColor}
            onChange={(v) => update("brandColor", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="brandColor">{t("onboarding.customColor")}</label>
          <input
            id="brandColor"
            type="color"
            value={form.brandColor}
            onChange={(e) => update("brandColor", e.target.value)}
            style={{ width: 60, padding: 2 }}
          />
        </div>
      </div>

      <div className={styles.actionsRow}>
        <button
          type="submit"
          className={`${styles.saveButton} ${styles.iconLabel}`}
          disabled={loading || exhausted}
          // A disabled button with no explanation reads as a broken page, so
          // the reason travels with it — as a title for a mouse, and as the
          // paragraph below for everyone else.
          title={exhausted ? t("onboarding.limitTooltip", { limit: usage?.limit ?? 3 }) : undefined}
        >
          <IconSparkles size={14} />
          {loading ? t("onboarding.generating") : t("onboarding.generate")}
        </button>

        {usage && (
          <span
            className={plugin.usageBadge}
            data-exhausted={exhausted}
            // aria-live so the count is announced when it changes after a
            // generation, rather than only being discoverable by re-reading.
            aria-live="polite"
          >
            {t("onboarding.generationsLeft", {
              remaining: usage.remaining,
              limit: usage.limit,
            })}
          </span>
        )}
        <Link className={`${styles.linkButton} ${styles.iconLabel}`} href={`/t/${tenantSlug}`}>
          {t("onboarding.skipForNow")}
          <IconArrowRight size={13} />
        </Link>
      </div>

      {exhausted && (
        <p className={plugin.usageNotice} role="status">
          {t("onboarding.limitReached", { limit: usage?.limit ?? 3 })}
        </p>
      )}
    </form>
  );
}

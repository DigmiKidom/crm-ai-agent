"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";
import PillGroup from "./PillGroup";
import CheckboxGroup from "./CheckboxGroup";
import ColorSwatchGroup from "./ColorSwatchGroup";
import { IconSparkles, IconArrowRight, IconExternalLink, IconOverview } from "./icons";

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "200+", label: "200+ employees" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "bold", label: "Bold" },
  { value: "minimal", label: "Minimal" },
];

const PERSONALITY_OPTIONS = [
  { value: "innovative", label: "Innovative" },
  { value: "trustworthy", label: "Trustworthy" },
  { value: "approachable", label: "Approachable" },
  { value: "premium", label: "Premium" },
  { value: "down-to-earth", label: "Down-to-earth" },
  { value: "playful", label: "Playful" },
  { value: "expert-led", label: "Expert-led" },
];

const STYLE_OPTIONS = [
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "classic", label: "Classic" },
  { value: "playful", label: "Playful" },
  { value: "elegant", label: "Elegant" },
  { value: "modern", label: "Modern" },
];

const TARGET_AUDIENCE_OPTIONS = [
  { value: "consumers", label: "Individual consumers" },
  { value: "small-business", label: "Small businesses" },
  { value: "enterprise", label: "Enterprises" },
  { value: "local-community", label: "Local community" },
  { value: "b2b", label: "Other businesses (B2B)" },
];

const TECHNOLOGY_OPTIONS = [
  { value: "traditional", label: "Traditional, high-touch" },
  { value: "balanced", label: "Balanced" },
  { value: "cutting-edge", label: "Cutting-edge, tech-forward" },
];

const COLOR_OPTIONS = [
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#7c3aed", label: "Purple" },
  { value: "#dc2626", label: "Red" },
  { value: "#ea580c", label: "Orange" },
  { value: "#0d9488", label: "Teal" },
  { value: "#db2777", label: "Pink" },
  { value: "#111827", label: "Black / Neutral" },
];

export default function OnboardingForm({ tenantSlug }) {
  const [form, setForm] = useState({
    industry: "",
    companySize: "1-10",
    leadDefinition: "",
    tone: "professional",
    personality: [],
    style: "modern",
    targetAudience: [],
    technology: "balanced",
    brandColor: "#2563eb",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

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
      data = { error: "Unexpected server error. Please try again." };
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    setResult(data);
  }

  if (result) {
    return (
      <div className={styles.detailCard}>
        <p style={{ marginBottom: 16 }}>
          Done — your landing page copy and pipeline are ready
          {result.templateName ? ` using the "${result.templateName}" template` : ""}.
        </p>
        <div className={styles.actionsRow} style={{ marginTop: 0 }}>
          <a className={`${styles.saveButton} ${styles.iconLabel}`} href={`/pages/${tenantSlug}`} target="_blank" rel="noreferrer">
            <IconExternalLink size={14} />
            View landing page
          </a>
          <a
            className={`${styles.deleteButton} ${styles.iconLabel}`}
            style={{ color: "inherit", borderColor: "var(--border)" }}
            href={`/t/${tenantSlug}`}
          >
            <IconOverview size={14} />
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.detailCard} onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
      {error && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>}

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>About your business</div>

        <div className={styles.detailField}>
          <label htmlFor="industry">Industry</label>
          <input
            id="industry"
            required
            placeholder="e.g. residential real estate, dental practice, marketing agency"
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
          />
        </div>

        <div className={styles.detailField}>
          <label>Company size</label>
          <PillGroup
            ariaLabel="Company size"
            options={COMPANY_SIZE_OPTIONS}
            value={form.companySize}
            onChange={(v) => update("companySize", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="leadDefinition">What counts as a lead for you?</label>
          <textarea
            id="leadDefinition"
            required
            rows={3}
            placeholder="e.g. someone who books a free consultation, or requests a quote"
            value={form.leadDefinition}
            onChange={(e) => update("leadDefinition", e.target.value)}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Brand & voice</div>
        <div className={styles.formSectionHint}>
          These shape how the AI writes your copy and picks a template.
        </div>

        <div className={styles.detailField}>
          <label>Tone</label>
          <PillGroup
            ariaLabel="Tone"
            options={TONE_OPTIONS}
            value={form.tone}
            onChange={(v) => update("tone", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>Personality (pick as many as fit)</label>
          <CheckboxGroup
            ariaLabel="Personality"
            options={PERSONALITY_OPTIONS}
            values={form.personality}
            onChange={(v) => update("personality", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>Visual style</label>
          <PillGroup
            ariaLabel="Visual style"
            options={STYLE_OPTIONS}
            value={form.style}
            onChange={(v) => update("style", v)}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Audience & technology</div>

        <div className={styles.detailField}>
          <label>Who are you selling to? (pick as many as fit)</label>
          <CheckboxGroup
            ariaLabel="Target audience"
            options={TARGET_AUDIENCE_OPTIONS}
            values={form.targetAudience}
            onChange={(v) => update("targetAudience", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>How tech-forward should this feel?</label>
          <PillGroup
            ariaLabel="Technology positioning"
            options={TECHNOLOGY_OPTIONS}
            value={form.technology}
            onChange={(v) => update("technology", v)}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>Brand color</div>

        <div className={styles.detailField}>
          <ColorSwatchGroup
            ariaLabel="Preferred color"
            options={COLOR_OPTIONS}
            value={form.brandColor}
            onChange={(v) => update("brandColor", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="brandColor">Or pick a custom color</label>
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
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={loading}>
          <IconSparkles size={14} />
          {loading ? "Generating..." : "Generate my site"}
        </button>
        <a className={`${styles.linkButton} ${styles.iconLabel}`} href={`/t/${tenantSlug}`}>
          Skip for now
          <IconArrowRight size={13} />
        </a>
      </div>
    </form>
  );
}

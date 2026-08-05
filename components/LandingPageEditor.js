"use client";

import { useState } from "react";
import ImageUpload from "./ImageUpload";
import IconPicker from "./IconPicker";
import styles from "./dashboard.module.css";
import { IconCheck, IconClose, IconPlus, IconExternalLink } from "./icons";

const MAX_FEATURES = 3;
const MAX_BACKGROUNDS = 3;
const MAX_DESCRIPTION = 300;

export default function LandingPageEditor({ tenantSlug, landingPage, hasLogo }) {
  const [form, setForm] = useState({
    headline: landingPage.headline || "",
    subheadline: landingPage.subheadline || "",
    ctaLabel: landingPage.ctaLabel || "",
    showLogo: landingPage.showLogo !== false,
    backgroundOverlay:
      typeof landingPage.backgroundOverlay === "number" ? landingPage.backgroundOverlay : 0.55,
    backgroundMediaIds: (landingPage.backgroundMediaIds || []).slice(0, MAX_BACKGROUNDS),
    features: landingPage.features?.length
      ? landingPage.features.slice(0, MAX_FEATURES).map((f) => ({
          title: f.title || "",
          description: f.description || "",
          icon: f.icon || "",
        }))
      : [{ title: "", description: "", icon: "" }],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  function updateFeature(index, field, value) {
    setForm((f) => ({
      ...f,
      features: f.features.map((feat, i) => (i === index ? { ...feat, [field]: value } : feat)),
    }));
    setSaved(false);
  }

  function addFeature() {
    setForm((f) =>
      f.features.length >= MAX_FEATURES
        ? f
        : { ...f, features: [...f.features, { title: "", description: "", icon: "" }] }
    );
    setSaved(false);
  }

  function removeFeature(index) {
    setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  // Backgrounds are a fixed-length list of MAX_BACKGROUNDS slots in the UI;
  // only the filled ones get persisted.
  function setBackground(slot, mediaId) {
    setForm((f) => {
      const next = [...f.backgroundMediaIds];
      if (mediaId === null) next.splice(slot, 1);
      else next[slot] = mediaId;
      return { ...f, backgroundMediaIds: next.filter(Boolean).slice(0, MAX_BACKGROUNDS) };
    });
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/tenant/landing-page", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: "Unexpected server error. Please try again." };
    }

    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Could not save changes.");
      return;
    }
    setSaved(true);
  }

  const backgroundSlots = Math.min(form.backgroundMediaIds.length + 1, MAX_BACKGROUNDS);

  return (
    <form className={styles.settingsForm} onSubmit={handleSave}>
      {error && <p className={styles.formError}>{error}</p>}

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Hero copy</h2>

        <div className={styles.detailField}>
          <label htmlFor="headline">Headline</label>
          <input
            id="headline"
            value={form.headline}
            onChange={(e) => update("headline", e.target.value)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="subheadline">Subheadline</label>
          <textarea
            id="subheadline"
            rows={2}
            value={form.subheadline}
            onChange={(e) => update("subheadline", e.target.value)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="ctaLabel">Call-to-action button text</label>
          <input
            id="ctaLabel"
            value={form.ctaLabel}
            onChange={(e) => update("ctaLabel", e.target.value)}
          />
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.showLogo}
            onChange={(e) => update("showLogo", e.target.checked)}
            disabled={!hasLogo}
          />
          <span>Show my company logo at the top of the page</span>
        </label>
        {!hasLogo && (
          <p className={styles.sectionHint}>
            Upload a logo in <a href={`/t/${tenantSlug}/settings`}>Settings</a> to enable this.
          </p>
        )}
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Background photos</h2>
        <p className={styles.sectionHint}>
          Up to {MAX_BACKGROUNDS} images behind your headline. Add one for a static background, or
          two to three to cross-fade between them. Images are resized and compressed automatically.
        </p>

        <div className={styles.backgroundGrid}>
          {Array.from({ length: backgroundSlots }).map((_, slot) => (
            <ImageUpload
              key={slot}
              kind="background"
              value={form.backgroundMediaIds[slot] || null}
              onChange={(id) => setBackground(slot, id)}
              label={`Photo ${slot + 1}`}
              hint="Landscape works best"
              previewClassName={styles.backgroundPreview}
            />
          ))}
        </div>

        {form.backgroundMediaIds.length > 0 && (
          <div className={styles.detailField} style={{ marginTop: 12 }}>
            <label htmlFor="overlay">
              Darkening overlay — {Math.round(form.backgroundOverlay * 100)}%
            </label>
            <input
              id="overlay"
              type="range"
              min="0"
              max="0.85"
              step="0.05"
              value={form.backgroundOverlay}
              onChange={(e) => update("backgroundOverlay", Number(e.target.value))}
            />
            <span className={styles.sectionHint}>
              More overlay keeps your headline readable over a busy photo.
            </span>
          </div>
        )}
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>
          Feature cards{" "}
          <span className={styles.countPill}>
            {form.features.length}/{MAX_FEATURES}
          </span>
        </h2>
        <p className={styles.sectionHint}>
          Up to {MAX_FEATURES} selling points, each with an optional icon — a coin for great pricing,
          a thumbs-up for honesty, and so on.
        </p>

        {form.features.map((feature, index) => (
          <div key={index} className={styles.featureRow}>
            <input
              placeholder="Feature title"
              value={feature.title}
              onChange={(e) => updateFeature(index, "title", e.target.value)}
            />
            <textarea
              rows={2}
              maxLength={MAX_DESCRIPTION}
              placeholder="Feature description"
              value={feature.description}
              onChange={(e) => updateFeature(index, "description", e.target.value)}
            />
            <span className={styles.charCount}>
              {feature.description.length}/{MAX_DESCRIPTION}
            </span>

            <IconPicker
              value={feature.icon}
              onChange={(key) => updateFeature(index, "icon", key)}
            />

            <button
              type="button"
              className={`${styles.linkButton} ${styles.iconLabel}`}
              style={{ color: "#b91c1c", alignSelf: "flex-start" }}
              onClick={() => removeFeature(index)}
              disabled={form.features.length <= 1}
            >
              <IconClose size={13} />
              Remove
            </button>
          </div>
        ))}

        {form.features.length < MAX_FEATURES && (
          <button
            type="button"
            className={`${styles.linkButton} ${styles.iconLabel}`}
            onClick={addFeature}
          >
            <IconPlus size={13} />
            Add feature
          </button>
        )}
      </section>

      <div className={styles.actionsRow}>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={saving}>
          <IconCheck size={14} />
          {saving ? "Saving..." : "Save changes"}
        </button>
        <a
          className={`${styles.deleteButton} ${styles.iconLabel}`}
          style={{ color: "inherit", borderColor: "var(--border)" }}
          href={`/l/${tenantSlug}`}
          target="_blank"
          rel="noreferrer"
        >
          <IconExternalLink size={14} />
          Preview landing page
        </a>
        {saved && <span className={styles.savedNote}>Saved</span>}
      </div>
    </form>
  );
}

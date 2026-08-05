"use client";

import { useState } from "react";
import ImageUpload from "./ImageUpload";
import IconPicker from "./IconPicker";
import TemplateThumbnail from "./TemplateThumbnail";
import styles from "./dashboard.module.css";
import { IconCheck, IconClose, IconPlus, IconExternalLink } from "./icons";

const MAX_FEATURES = 3;
const MAX_BACKGROUNDS = 3;
const MAX_GALLERY = 6;
const GALLERY_COLUMNS = [2, 3, 4];
const MAX_DESCRIPTION = 300;

function blankFeature() {
  return { title: "", description: "", icon: "", topStrip: false, border: false, accentColor: "primary" };
}

export default function LandingPageEditor({
  tenantSlug,
  landingPage,
  hasLogo,
  theme,
  templates = [],
  templateId,
}) {
  const [form, setForm] = useState({
    headline: landingPage.headline || "",
    subheadline: landingPage.subheadline || "",
    ctaLabel: landingPage.ctaLabel || "",
    showLogo: landingPage.showLogo !== false,
    backgroundOverlay:
      typeof landingPage.backgroundOverlay === "number" ? landingPage.backgroundOverlay : 0.55,
    backgroundMediaIds: (landingPage.backgroundMediaIds || []).slice(0, MAX_BACKGROUNDS),
    galleryMediaIds: (landingPage.galleryMediaIds || []).slice(0, MAX_GALLERY),
    galleryColumns: GALLERY_COLUMNS.includes(landingPage.galleryColumns)
      ? landingPage.galleryColumns
      : 3,
    templateId: templateId || "default",
    features: landingPage.features?.length
      ? landingPage.features.slice(0, MAX_FEATURES).map((f) => ({
          title: f.title || "",
          description: f.description || "",
          icon: f.icon || "",
          topStrip: Boolean(f.topStrip),
          border: Boolean(f.border),
          accentColor: f.accentColor === "accent" ? "accent" : "primary",
        }))
      : [blankFeature()],
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
        : { ...f, features: [...f.features, blankFeature()] }
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

  // Same pattern as backgrounds, just with a longer, fixed-length slot list.
  function setGalleryPhoto(slot, mediaId) {
    setForm((f) => {
      const next = [...f.galleryMediaIds];
      if (mediaId === null) next.splice(slot, 1);
      else next[slot] = mediaId;
      return { ...f, galleryMediaIds: next.filter(Boolean).slice(0, MAX_GALLERY) };
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
  const gallerySlots = Math.min(form.galleryMediaIds.length + 1, MAX_GALLERY);

  return (
    <form className={styles.settingsForm} onSubmit={handleSave}>
      {error && <p className={styles.formError}>{error}</p>}

      {templates.length > 0 && (
        <section className={styles.detailCard} style={{ maxWidth: 760 }}>
          <h2 className={styles.sectionTitle}>Template</h2>
          <p className={styles.sectionHint}>
            Preview any template with your own content before switching — nothing saves until you
            hit Save changes below.
          </p>

          <div className={styles.templateGrid}>
            {templates.map((t) => {
              const active = form.templateId === t.id;
              return (
                <div
                  key={t.id}
                  className={`${styles.templateCard} ${active ? styles.templateCardActive : ""}`}
                >
                  <TemplateThumbnail id={t.id} />
                  <div className={styles.templateCardHeader}>
                    <strong>{t.name}</strong>
                    {active && <span className={styles.countPill}>Selected</span>}
                  </div>
                  <p className={styles.templateCardDescription}>{t.description}</p>
                  <div className={styles.templateCardActions}>
                    <a
                      className={`${styles.linkButton} ${styles.iconLabel}`}
                      href={`/pages/${tenantSlug}?template=${t.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <IconExternalLink size={13} />
                      Preview
                    </a>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => update("templateId", t.id)}
                      disabled={active}
                    >
                      {active ? "In use" : "Use this template"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

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

      <section className={styles.detailCard} style={{ maxWidth: 760 }}>
        <h2 className={styles.sectionTitle}>
          Photo gallery{" "}
          <span className={styles.countPill}>
            {form.galleryMediaIds.length}/{MAX_GALLERY}
          </span>
        </h2>
        <p className={styles.sectionHint}>
          Up to {MAX_GALLERY} photos shown in a grid further down the page — good for a portfolio,
          past work, your space, or your team.
        </p>

        <div className={styles.backgroundGrid}>
          {Array.from({ length: gallerySlots }).map((_, slot) => (
            <ImageUpload
              key={slot}
              kind="gallery"
              value={form.galleryMediaIds[slot] || null}
              onChange={(id) => setGalleryPhoto(slot, id)}
              label={`Photo ${slot + 1}`}
              previewClassName={styles.backgroundPreview}
            />
          ))}
        </div>

        {form.galleryMediaIds.length > 0 && (
          <div className={styles.detailField} style={{ marginTop: 12 }}>
            <span className={styles.iconPickerLabel}>Grid columns</span>
            <div className={styles.colorToggle} role="radiogroup" aria-label="Gallery columns">
              {GALLERY_COLUMNS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={form.galleryColumns === n}
                  className={`${styles.colorToggleOption} ${
                    form.galleryColumns === n ? styles.colorToggleOptionActive : ""
                  }`}
                  onClick={() => update("galleryColumns", n)}
                >
                  {n} columns
                </button>
              ))}
            </div>
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

            <div className={styles.cardStyleRow}>
              <span className={styles.iconPickerLabel}>Card styling</span>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={feature.topStrip}
                  onChange={(e) => updateFeature(index, "topStrip", e.target.checked)}
                />
                <span>Coloured top strip</span>
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={feature.border}
                  onChange={(e) => updateFeature(index, "border", e.target.checked)}
                />
                <span>Coloured border</span>
              </label>

              {/* The colour toggle is meaningless until one of the two is on. */}
              {(feature.topStrip || feature.border) && (
                <div className={styles.colorToggle} role="radiogroup" aria-label="Card colour">
                  {[
                    ["primary", "Primary", theme?.primaryColor || "#2563eb"],
                    ["accent", "Accent", theme?.accentColor || "#111827"],
                  ].map(([value, label, swatch]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={feature.accentColor === value}
                      className={`${styles.colorToggleOption} ${
                        feature.accentColor === value ? styles.colorToggleOptionActive : ""
                      }`}
                      onClick={() => updateFeature(index, "accentColor", value)}
                    >
                      <span className={styles.colorSwatch} style={{ background: swatch }} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
          href={`/pages/${tenantSlug}`}
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

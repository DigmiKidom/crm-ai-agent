"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";
import { IconCheck, IconClose, IconPlus, IconExternalLink } from "./icons";

export default function LandingPageEditor({ tenantSlug, landingPage }) {
  const [form, setForm] = useState({
    headline: landingPage.headline || "",
    subheadline: landingPage.subheadline || "",
    ctaLabel: landingPage.ctaLabel || "",
    features: landingPage.features?.length
      ? landingPage.features
      : [{ title: "", description: "" }],
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
    setForm((f) => ({ ...f, features: [...f.features, { title: "", description: "" }] }));
    setSaved(false);
  }

  function removeFeature(index) {
    setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== index) }));
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

  return (
    <form className={styles.detailCard} onSubmit={handleSave} style={{ maxWidth: 640 }}>
      {error && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>}

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

      <div className={styles.detailField}>
        <label>Features</label>
        {form.features.map((feature, index) => (
          <div key={index} className={styles.featureRow}>
            <input
              placeholder="Feature title"
              value={feature.title}
              onChange={(e) => updateFeature(index, "title", e.target.value)}
            />
            <textarea
              rows={2}
              placeholder="Feature description"
              value={feature.description}
              onChange={(e) => updateFeature(index, "description", e.target.value)}
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
        <button type="button" className={`${styles.linkButton} ${styles.iconLabel}`} onClick={addFeature}>
          <IconPlus size={13} />
          Add feature
        </button>
      </div>

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

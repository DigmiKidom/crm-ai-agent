"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

export default function OnboardingForm({ tenantSlug }) {
  const [form, setForm] = useState({
    industry: "",
    companySize: "1-10",
    leadDefinition: "",
    tone: "professional",
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
          Done — your landing page copy and pipeline are ready.
        </p>
        <div className={styles.actionsRow} style={{ marginTop: 0 }}>
          <a className={styles.saveButton} href={`/l/${tenantSlug}`} target="_blank" rel="noreferrer">
            View landing page
          </a>
          <a className={styles.deleteButton} style={{ color: "inherit", borderColor: "var(--border)" }} href={`/t/${tenantSlug}`}>
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.detailCard} onSubmit={handleSubmit}>
      {error && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>}

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
        <label htmlFor="companySize">Company size</label>
        <select
          id="companySize"
          value={form.companySize}
          onChange={(e) => update("companySize", e.target.value)}
        >
          <option value="1-10">1-10 employees</option>
          <option value="11-50">11-50 employees</option>
          <option value="51-200">51-200 employees</option>
          <option value="200+">200+ employees</option>
        </select>
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

      <div className={styles.detailField}>
        <label htmlFor="tone">Tone</label>
        <select id="tone" value={form.tone} onChange={(e) => update("tone", e.target.value)}>
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="bold">Bold</option>
          <option value="minimal">Minimal</option>
        </select>
      </div>

      <div className={styles.detailField}>
        <label htmlFor="brandColor">Brand color</label>
        <input
          id="brandColor"
          type="color"
          value={form.brandColor}
          onChange={(e) => update("brandColor", e.target.value)}
          style={{ width: 60, padding: 2 }}
        />
      </div>

      <div className={styles.actionsRow}>
        <button type="submit" className={styles.saveButton} disabled={loading}>
          {loading ? "Generating..." : "Generate my site"}
        </button>
        <a className={styles.linkButton} href={`/t/${tenantSlug}`}>
          Skip for now
        </a>
      </div>
    </form>
  );
}

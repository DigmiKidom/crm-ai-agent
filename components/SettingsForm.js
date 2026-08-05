"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "./ImageUpload";
import ThemeToggle from "./ThemeToggle";
import { IconCheck } from "./icons";
import styles from "./dashboard.module.css";

const FONT_OPTIONS = [
  { value: "system-ui, sans-serif", label: "System (default)" },
  { value: "Georgia, 'Times New Roman', serif", label: "Serif — classic" },
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: "Helvetica — neutral" },
  { value: "'Trebuchet MS', 'Segoe UI', sans-serif", label: "Trebuchet — friendly" },
  { value: "'Courier New', monospace", label: "Monospace — technical" },
];

export default function SettingsForm({ tenant }) {
  const [form, setForm] = useState({
    name: tenant.name || "",
    logoMediaId: tenant.logoMediaId || null,
    profile: {
      legalName: tenant.profile?.legalName || "",
      tagline: tenant.profile?.tagline || "",
      about: tenant.profile?.about || "",
      contactEmail: tenant.profile?.contactEmail || "",
      contactPhone: tenant.profile?.contactPhone || "",
      addressLine: tenant.profile?.addressLine || "",
      city: tenant.profile?.city || "",
      country: tenant.profile?.country || "",
      website: tenant.profile?.website || "",
      social: {
        facebook: tenant.profile?.social?.facebook || "",
        instagram: tenant.profile?.social?.instagram || "",
        linkedin: tenant.profile?.social?.linkedin || "",
        x: tenant.profile?.social?.x || "",
      },
    },
    theme: {
      primaryColor: tenant.theme?.primaryColor || "#2563eb",
      accentColor: tenant.theme?.accentColor || "#111827",
      fontFamily: tenant.theme?.fontFamily || "system-ui, sans-serif",
    },
    notifications: {
      emailOnNewLead: Boolean(tenant.notifications?.emailOnNewLead),
    },
  });

  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function touch() {
    setSaved(false);
    setError("");
  }

  function setTop(field, value) {
    touch();
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setProfile(field, value) {
    touch();
    setForm((f) => ({ ...f, profile: { ...f.profile, [field]: value } }));
  }

  function setSocial(field, value) {
    touch();
    setForm((f) => ({
      ...f,
      profile: { ...f.profile, social: { ...f.profile.social, [field]: value } },
    }));
  }

  function setTheme(field, value) {
    touch();
    setForm((f) => ({ ...f, theme: { ...f.theme, [field]: value } }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/tenant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({ error: "Unexpected server error." }));
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Could not save settings.");
      return;
    }
    setSaved(true);
    // The sidebar renders the company logo and name from the layout, which
    // won't re-run on its own — refresh so a new logo shows up immediately.
    router.refresh();
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSave}>
      {error && <p className={styles.formError}>{error}</p>}

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <p className={styles.sectionHint}>
          A display preference saved on this device — it doesn&apos;t affect your public landing
          page or your other devices.
        </p>
        <ThemeToggle />
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Company profile</h2>
        <p className={styles.sectionHint}>
          Used across your dashboard and shown on your public landing page.
        </p>

        <div className={styles.detailField}>
          <label htmlFor="name">Company name</label>
          <input id="name" value={form.name} onChange={(e) => setTop("name", e.target.value)} />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="legalName">Legal name</label>
            <input
              id="legalName"
              placeholder="Acme Services Ltd."
              value={form.profile.legalName}
              onChange={(e) => setProfile("legalName", e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="tagline">Tagline</label>
            <input
              id="tagline"
              placeholder="Plumbing done right, first time"
              value={form.profile.tagline}
              onChange={(e) => setProfile("tagline", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="about">About</label>
          <textarea
            id="about"
            rows={3}
            maxLength={600}
            placeholder="A short paragraph about what your company does."
            value={form.profile.about}
            onChange={(e) => setProfile("about", e.target.value)}
          />
          <span className={styles.charCount}>{form.profile.about.length}/600</span>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Logo</h2>
        <p className={styles.sectionHint}>
          Square or wide images both work. Resized and compressed automatically — upload the
          highest quality file you have.
        </p>
        <ImageUpload
          kind="logo"
          value={form.logoMediaId}
          onChange={(id) => setTop("logoMediaId", id)}
          hint="PNG with transparency looks best"
          previewClassName={styles.logoPreview}
        />
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Contact details</h2>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="contactEmail">Contact email</label>
            <input
              id="contactEmail"
              type="email"
              placeholder="hello@yourcompany.com"
              value={form.profile.contactEmail}
              onChange={(e) => setProfile("contactEmail", e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="contactPhone">Phone</label>
            <input
              id="contactPhone"
              placeholder="+972 50 000 0000"
              value={form.profile.contactPhone}
              onChange={(e) => setProfile("contactPhone", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="addressLine">Address</label>
          <input
            id="addressLine"
            placeholder="12 Rothschild Blvd"
            value={form.profile.addressLine}
            onChange={(e) => setProfile("addressLine", e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="city">City</label>
            <input
              id="city"
              value={form.profile.city}
              onChange={(e) => setProfile("city", e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="country">Country</label>
            <input
              id="country"
              value={form.profile.country}
              onChange={(e) => setProfile("country", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="website">Website</label>
          <input
            id="website"
            placeholder="https://yourcompany.com"
            value={form.profile.website}
            onChange={(e) => setProfile("website", e.target.value)}
          />
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Social links</h2>
        <p className={styles.sectionHint}>Leave blank to hide. Shown in your landing page footer.</p>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="facebook">Facebook</label>
            <input
              id="facebook"
              placeholder="https://facebook.com/…"
              value={form.profile.social.facebook}
              onChange={(e) => setSocial("facebook", e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="instagram">Instagram</label>
            <input
              id="instagram"
              placeholder="https://instagram.com/…"
              value={form.profile.social.instagram}
              onChange={(e) => setSocial("instagram", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="linkedin">LinkedIn</label>
            <input
              id="linkedin"
              placeholder="https://linkedin.com/company/…"
              value={form.profile.social.linkedin}
              onChange={(e) => setSocial("linkedin", e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="x">X / Twitter</label>
            <input
              id="x"
              placeholder="https://x.com/…"
              value={form.profile.social.x}
              onChange={(e) => setSocial("x", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Branding</h2>
        <p className={styles.sectionHint}>Applied to your landing page immediately after saving.</p>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="primaryColor">Primary colour</label>
            <div className={styles.colorField}>
              <input
                id="primaryColor"
                type="color"
                value={form.theme.primaryColor}
                onChange={(e) => setTheme("primaryColor", e.target.value)}
              />
              <input
                aria-label="Primary colour hex"
                value={form.theme.primaryColor}
                onChange={(e) => setTheme("primaryColor", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.detailField}>
            <label htmlFor="accentColor">Accent colour</label>
            <div className={styles.colorField}>
              <input
                id="accentColor"
                type="color"
                value={form.theme.accentColor}
                onChange={(e) => setTheme("accentColor", e.target.value)}
              />
              <input
                aria-label="Accent colour hex"
                value={form.theme.accentColor}
                onChange={(e) => setTheme("accentColor", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="fontFamily">Font</label>
          <select
            id="fontFamily"
            value={form.theme.fontFamily}
            onChange={(e) => setTheme("fontFamily", e.target.value)}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.notifications.emailOnNewLead}
            onChange={(e) => {
              touch();
              setForm((f) => ({
                ...f,
                notifications: { ...f.notifications, emailOnNewLead: e.target.checked },
              }));
            }}
          />
          <span>Email me whenever a new lead comes in</span>
        </label>
        <p className={styles.sectionHint}>
          The unread dot in the sidebar is always on — this adds an email on top of it.
        </p>
      </section>

      <div className={styles.actionsRow}>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={saving}>
          <IconCheck size={14} />
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className={styles.savedNote}>Saved</span>}
      </div>
    </form>
  );
}

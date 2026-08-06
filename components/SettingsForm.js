"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "./ImageUpload";
import PillGroup from "./PillGroup";
import CheckboxGroup from "./CheckboxGroup";
import { useT } from "@/components/i18n/LocaleProvider";
import ThemeToggle from "./ThemeToggle";
import { IconCheck } from "./icons";
import styles from "./dashboard.module.css";
import {
  TONE_VALUES,
  PERSONALITY_VALUES,
  STYLE_VALUES,
  AUDIENCE_VALUES,
  TECH_VALUES,
  DEFAULT_AGENT_PREFERENCES,
} from "@/lib/agentPreferences";

// Values are real CSS font stacks written to the tenant; only the label is
// translated, so switching UI language can't change a tenant's chosen font.
const FONT_OPTIONS = [
  { value: "system-ui, sans-serif", key: "system" },
  { value: "Georgia, 'Times New Roman', serif", key: "serif" },
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", key: "helvetica" },
  { value: "'Trebuchet MS', 'Segoe UI', sans-serif", key: "trebuchet" },
  { value: "'Courier New', monospace", key: "mono" },
];

export default function SettingsForm({ tenant }) {
  const t = useT();

  // Reuses the exact same `onboarding.*Opt.*` dictionary keys the AI Setup
  // form translates its options with — one set of labels for one set of
  // stable English values (lib/agentPreferences.js), not a duplicate
  // "settings.*" copy of the same strings.
  const opts = (values, ns) => values.map((v) => ({ value: v, label: t(`onboarding.${ns}.${v}`) }));
  const TONE_OPTIONS = opts(TONE_VALUES, "toneOpt");
  const PERSONALITY_OPTIONS = opts(PERSONALITY_VALUES, "personalityOpt");
  const STYLE_OPTIONS = opts(STYLE_VALUES, "styleOpt");
  const TARGET_AUDIENCE_OPTIONS = opts(AUDIENCE_VALUES, "audienceOpt");
  const TECHNOLOGY_OPTIONS = opts(TECH_VALUES, "techOpt");

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
    agentPreferences: {
      tone: tenant.agentPreferences?.tone || DEFAULT_AGENT_PREFERENCES.tone,
      personality: tenant.agentPreferences?.personality || DEFAULT_AGENT_PREFERENCES.personality,
      style: tenant.agentPreferences?.style || DEFAULT_AGENT_PREFERENCES.style,
      targetAudience: tenant.agentPreferences?.targetAudience || DEFAULT_AGENT_PREFERENCES.targetAudience,
      technology: tenant.agentPreferences?.technology || DEFAULT_AGENT_PREFERENCES.technology,
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

  function setAgentPreference(field, value) {
    touch();
    setForm((f) => ({ ...f, agentPreferences: { ...f.agentPreferences, [field]: value } }));
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

    const data = await res.json().catch(() => ({ error: t("settings.serverError") }));
    setSaving(false);

    if (!res.ok) {
      setError(data.error || t("settings.saveFailed"));
      return;
    }
    setSaved(true);
    // The sidebar renders the company logo and name from the layout, which
    // won't re-run on its own — refresh so a new logo shows up immediately.
    router.refresh();
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSave}>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("settings.appearance")}</h2>
        <p className={styles.sectionHint}>
          A display preference saved on this device — it doesn&apos;t affect your public landing
          page or your other devices.
        </p>
        <ThemeToggle />
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("settings.companyProfile")}</h2>
        <p className={styles.sectionHint}>{t("settings.companyProfileHint")}</p>

        <div className={styles.detailField}>
          <label htmlFor="name">{t("settings.companyName")}</label>
          <input id="name" value={form.name} onChange={(e) => setTop("name", e.target.value)} />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="legalName">{t("settings.legalName")}</label>
            <input
              id="legalName"
              placeholder={t("settings.ph.legalName")}
              value={form.profile.legalName}
              onChange={(e) => setProfile("legalName", e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="tagline">{t("settings.tagline")}</label>
            <input
              id="tagline"
              placeholder={t("settings.ph.tagline")}
              value={form.profile.tagline}
              onChange={(e) => setProfile("tagline", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="about">{t("settings.about")}</label>
          <textarea
            id="about"
            rows={3}
            maxLength={600}
            placeholder={t("settings.ph.about")}
            value={form.profile.about}
            onChange={(e) => setProfile("about", e.target.value)}
          />
          <span className={styles.charCount}>{form.profile.about.length}/600</span>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("settings.logo")}</h2>
        <p className={styles.sectionHint}>
          {t("settings.logoUploadHint")}
        </p>
        <ImageUpload
          kind="logo"
          value={form.logoMediaId}
          onChange={(id) => setTop("logoMediaId", id)}
          hint={t("settings.logoHint")}
          previewClassName={styles.logoPreview}
        />
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("settings.contactDetails")}</h2>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="contactEmail">{t("settings.contactEmail")}</label>
            <input
              id="contactEmail"
              type="email"
              placeholder={t("settings.ph.email")}
              value={form.profile.contactEmail}
              onChange={(e) => setProfile("contactEmail", e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="contactPhone">{t("settings.phone")}</label>
            <input
              id="contactPhone"
              placeholder={t("settings.ph.phone")}
              value={form.profile.contactPhone}
              onChange={(e) => setProfile("contactPhone", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="addressLine">{t("settings.address")}</label>
          <input
            id="addressLine"
            placeholder={t("settings.ph.address")}
            value={form.profile.addressLine}
            onChange={(e) => setProfile("addressLine", e.target.value)}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="city">{t("settings.city")}</label>
            <input
              id="city"
              value={form.profile.city}
              onChange={(e) => setProfile("city", e.target.value)}
            />
          </div>
          <div className={styles.detailField}>
            <label htmlFor="country">{t("settings.country")}</label>
            <input
              id="country"
              value={form.profile.country}
              onChange={(e) => setProfile("country", e.target.value)}
            />
          </div>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="website">{t("settings.website")}</label>
          <input
            id="website"
            placeholder={t("settings.ph.website")}
            value={form.profile.website}
            onChange={(e) => setProfile("website", e.target.value)}
          />
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("settings.socialLinks")}</h2>
        <p className={styles.sectionHint}>{t("settings.socialLinksHint")}</p>

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
        <h2 className={styles.sectionTitle}>{t("settings.branding")}</h2>
        <p className={styles.sectionHint}>{t("settings.brandingHint")}</p>

        <div className={styles.fieldRow}>
          <div className={styles.detailField}>
            <label htmlFor="primaryColor">{t("settings.primaryColour")}</label>
            <div className={styles.colorField}>
              <input
                id="primaryColor"
                type="color"
                value={form.theme.primaryColor}
                onChange={(e) => setTheme("primaryColor", e.target.value)}
              />
              <input
                aria-label={t("settings.primaryColourHex")}
                value={form.theme.primaryColor}
                onChange={(e) => setTheme("primaryColor", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.detailField}>
            <label htmlFor="accentColor">{t("settings.accentColour")}</label>
            <div className={styles.colorField}>
              <input
                id="accentColor"
                type="color"
                value={form.theme.accentColor}
                onChange={(e) => setTheme("accentColor", e.target.value)}
              />
              <input
                aria-label={t("settings.accentColourHex")}
                value={form.theme.accentColor}
                onChange={(e) => setTheme("accentColor", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="fontFamily">{t("settings.font")}</label>
          <select
            id="fontFamily"
            value={form.theme.fontFamily}
            onChange={(e) => setTheme("fontFamily", e.target.value)}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {t(`settings.fontOpt.${f.key}`)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("settings.brandVoice")}</h2>
        <p className={styles.sectionHint}>{t("settings.brandVoiceHint")}</p>

        <div className={styles.detailField}>
          <label>{t("onboarding.tone")}</label>
          <PillGroup
            ariaLabel={t("onboarding.tone")}
            options={TONE_OPTIONS}
            value={form.agentPreferences.tone}
            onChange={(v) => setAgentPreference("tone", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.personalityLabel")}</label>
          <CheckboxGroup
            ariaLabel={t("onboarding.personality")}
            options={PERSONALITY_OPTIONS}
            values={form.agentPreferences.personality}
            onChange={(v) => setAgentPreference("personality", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.visualStyle")}</label>
          <PillGroup
            ariaLabel={t("onboarding.visualStyle")}
            options={STYLE_OPTIONS}
            value={form.agentPreferences.style}
            onChange={(v) => setAgentPreference("style", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.targetAudienceLabel")}</label>
          <CheckboxGroup
            ariaLabel={t("onboarding.targetAudience")}
            options={TARGET_AUDIENCE_OPTIONS}
            values={form.agentPreferences.targetAudience}
            onChange={(v) => setAgentPreference("targetAudience", v)}
          />
        </div>

        <div className={styles.detailField}>
          <label>{t("onboarding.technologyLabel")}</label>
          <PillGroup
            ariaLabel={t("onboarding.technology")}
            options={TECHNOLOGY_OPTIONS}
            value={form.agentPreferences.technology}
            onChange={(v) => setAgentPreference("technology", v)}
          />
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("settings.notifications")}</h2>
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
          <span>{t("settings.emailOnNewLead")}</span>
        </label>
        <p className={styles.sectionHint}>{t("settings.emailOnNewLeadHint")}</p>
      </section>

      <div className={styles.actionsRow}>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={saving}>
          <IconCheck size={14} />
          {saving ? t("common.saving") : t("settings.saveSettings")}
        </button>
        {saved && (
          <span className={styles.savedNote} role="status">
            {t("settings.saved")}
          </span>
        )}
      </div>
    </form>
  );
}

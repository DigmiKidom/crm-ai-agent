"use client";

import { useState } from "react";
import ImageUpload from "./ImageUpload";
import IconPicker from "./IconPicker";
import TemplateThumbnail from "./TemplateThumbnail";
import styles from "./dashboard.module.css";
import { IconCheck, IconClose, IconPlus, IconExternalLink, IconChevronUp, IconChevronDown, IconGlobe, IconSparkles } from "./icons";
import { useT } from "@/components/i18n/LocaleProvider";
import { CONTENT_LANGUAGES } from "@/lib/i18n/languages";
import {
  MAX_FORM_FIELDS,
  FIELD_TYPES,
  CORE_FIELDS,
  isCoreKey,
  isChoiceType,
  blankCustomField,
  defaultFormFields,
  MAX_FIELD_OPTIONS,
} from "@/lib/formFields";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_URL_KEYS,
  DEFAULT_WHATSAPP_MESSAGE,
  MAX_WHATSAPP_MESSAGE,
  isValidPhone,
  whatsappUrl,
} from "@/lib/socialLinks";
import { MAX_FAQ_ITEMS, MAX_FAQ_ANSWER, blankFaqItem } from "@/lib/faq";
import { SocialIcon } from "./SocialIcons";

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
  variantCounts = null,
  // Lives on tenant.profile.social (it's business contact information, not
  // page content), but is edited here because this is where an owner thinks
  // about what visitors see. Settings still edits the same four URL fields.
  social = null,
}) {
  const t = useT();
  const [form, setForm] = useState({
    headline: landingPage.headline || "",
    headlineVariantB: landingPage.headlineVariantB || "",
    subheadline: landingPage.subheadline || "",
    ctaLabel: landingPage.ctaLabel || "",
    showLogo: landingPage.showLogo !== false,
    showTeamSection: Boolean(landingPage.showTeamSection),
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
    // The language this page's copy is written in — see lib/i18n/languages.js.
    // Editable here so a tenant can fix a wrong AI guess, or switch after
    // rewriting the page by hand, without rerunning AI Setup.
    language: {
      code: landingPage.language?.code || "en",
      name: landingPage.language?.name || "English",
      dir: landingPage.language?.dir === "rtl" ? "rtl" : "ltr",
    },
    // The visitor-facing lead form. Falls back to the four core fields so a
    // tenant who's never touched this still sees something sensible to edit,
    // rather than a blank list.
    // Social profiles and the WhatsApp quick-message setup. Stored flat here
    // (one key per platform) and reassembled on save.
    social: {
      ...Object.fromEntries(SOCIAL_URL_KEYS.map((key) => [key, social?.[key] || ""])),
      whatsapp: {
        number: social?.whatsapp?.number || "",
        message: social?.whatsapp?.message || "",
      },
    },
    showSocialInHero: landingPage.showSocialInHero !== false,
    faqHeading: landingPage.faqHeading || "",
    // One empty row when there's nothing saved, so there's somewhere to type
    // — normalizeFaq() on the server drops it again if it stays empty.
    faq: landingPage.faq?.length
      ? landingPage.faq.map((item) => ({ question: item.question || "", answer: item.answer || "" }))
      : [blankFaqItem()],
    formFields: landingPage.formFields?.length
      ? landingPage.formFields.map((f) => ({
          key: f.key,
          label: f.label || "",
          type: isCoreKey(f.key) ? CORE_FIELDS[f.key].type : FIELD_TYPES.includes(f.type) ? f.type : "text",
          required: f.key === "name" ? true : Boolean(f.required),
          options: Array.isArray(f.options) ? f.options : [],
        }))
      : defaultFormFields({
          name: t("editor.defaultFieldName"),
          email: t("editor.defaultFieldEmail"),
          phone: t("editor.defaultFieldPhone"),
          message: t("editor.defaultFieldMessage"),
        }),
    statusMessages: {
      sending: landingPage.formLabels?.sending || "",
      success: landingPage.formLabels?.success || "",
      error: landingPage.formLabels?.error || "",
    },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [faqGenerating, setFaqGenerating] = useState(false);

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

  function setLanguage(code) {
    const known = CONTENT_LANGUAGES.find((l) => l.code === code);
    if (!known) return;
    setForm((f) => ({ ...f, language: { code: known.code, name: known.name, dir: known.dir } }));
    setSaved(false);
  }

  function updateFormField(key, patch) {
    setForm((f) => ({
      ...f,
      formFields: f.formFields.map((field) => (field.key === key ? { ...field, ...patch } : field)),
    }));
    setSaved(false);
  }

  function moveFormField(index, direction) {
    setForm((f) => {
      const next = [...f.formFields];
      const target = index + direction;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, formFields: next };
    });
    setSaved(false);
  }

  function addFormField() {
    setForm((f) =>
      f.formFields.length >= MAX_FORM_FIELDS
        ? f
        : { ...f, formFields: [...f.formFields, blankCustomField()] }
    );
    setSaved(false);
  }

  function removeFormField(key) {
    setForm((f) => ({ ...f, formFields: f.formFields.filter((field) => field.key !== key) }));
    setSaved(false);
  }

  function updateSocial(key, value) {
    setForm((f) => ({ ...f, social: { ...f.social, [key]: value } }));
    setSaved(false);
  }

  function updateWhatsapp(key, value) {
    setForm((f) => ({ ...f, social: { ...f.social, whatsapp: { ...f.social.whatsapp, [key]: value } } }));
    setSaved(false);
  }

  // ── Choice fields ────────────────────────────────────────────────────────
  // "select" and "checkbox" carry their own list of answers. Switching a
  // field to one of them seeds a single empty option so there's a box to
  // type into; switching away leaves the list in state (harmless — the
  // server drops options for non-choice types) so a mis-click doesn't
  // destroy what was typed.
  function changeFieldType(key, type) {
    setForm((f) => ({
      ...f,
      formFields: f.formFields.map((field) =>
        field.key === key
          ? {
              ...field,
              type,
              options: isChoiceType(type) && field.options.length === 0 ? [""] : field.options,
            }
          : field
      ),
    }));
    setSaved(false);
  }

  function updateFieldOption(key, index, value) {
    setForm((f) => ({
      ...f,
      formFields: f.formFields.map((field) =>
        field.key === key
          ? { ...field, options: field.options.map((o, i) => (i === index ? value : o)) }
          : field
      ),
    }));
    setSaved(false);
  }

  function addFieldOption(key) {
    setForm((f) => ({
      ...f,
      formFields: f.formFields.map((field) =>
        field.key === key && field.options.length < MAX_FIELD_OPTIONS
          ? { ...field, options: [...field.options, ""] }
          : field
      ),
    }));
    setSaved(false);
  }

  function removeFieldOption(key, index) {
    setForm((f) => ({
      ...f,
      formFields: f.formFields.map((field) =>
        field.key === key ? { ...field, options: field.options.filter((_, i) => i !== index) } : field
      ),
    }));
    setSaved(false);
  }

  // ── FAQ ──────────────────────────────────────────────────────────────────
  function updateFaq(index, key, value) {
    setForm((f) => ({
      ...f,
      faq: f.faq.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
    setSaved(false);
  }

  function addFaqItem() {
    setForm((f) => (f.faq.length >= MAX_FAQ_ITEMS ? f : { ...f, faq: [...f.faq, blankFaqItem()] }));
    setSaved(false);
  }

  function removeFaqItem(index) {
    setForm((f) => {
      const next = f.faq.filter((_, i) => i !== index);
      // Never leave the section with nothing to type into.
      return { ...f, faq: next.length ? next : [blankFaqItem()] };
    });
    setSaved(false);
  }

  function moveFaqItem(index, direction) {
    setForm((f) => {
      const next = [...f.faq];
      const target = index + direction;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, faq: next };
    });
    setSaved(false);
  }

  /**
   * Asks the agent for a starter FAQ based on what's already on the page.
   * Replaces the list wholesale rather than appending — this is a "write me
   * one" button, not a "add more" one, and the result is fully editable
   * afterward like any other content.
   */
  async function generateFaq() {
    setFaqGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/agent/faq", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !Array.isArray(data.faq) || data.faq.length === 0) {
        setError(data.error || t("editor.faqGenerateFailed"));
        return;
      }

      setForm((f) => ({
        ...f,
        faq: data.faq.slice(0, MAX_FAQ_ITEMS).map((item) => ({
          question: item.question || "",
          answer: item.answer || "",
        })),
      }));
      setSaved(false);
    } catch {
      setError(t("editor.faqGenerateFailed"));
    } finally {
      setFaqGenerating(false);
    }
  }

  function updateStatusMessage(key, value) {
    setForm((f) => ({ ...f, statusMessages: { ...f.statusMessages, [key]: value } }));
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
      data = { error: t("editor.serverError") };
    }

    setSaving(false);

    if (!res.ok) {
      setError(data.error || t("editor.saveFailed"));
      return;
    }
    setSaved(true);
  }

  const backgroundSlots = Math.min(form.backgroundMediaIds.length + 1, MAX_BACKGROUNDS);
  const gallerySlots = Math.min(form.galleryMediaIds.length + 1, MAX_GALLERY);

  return (
    <form className={styles.settingsForm} onSubmit={handleSave}>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      {templates.length > 0 && (
        <section className={styles.detailCard} style={{ maxWidth: 760 }}>
          <h2 className={styles.sectionTitle}>{t("editor.template")}</h2>
          <p className={styles.sectionHint}>
            {t("editor.templateHint")}
          </p>

          <div className={styles.templateGrid}>
            {templates.map((tpl) => {
              const active = form.templateId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className={`${styles.templateCard} ${active ? styles.templateCardActive : ""}`}
                >
                  <TemplateThumbnail id={tpl.id} />
                  <div className={styles.templateCardHeader}>
                    <strong>{tpl.name}</strong>
                    {active && <span className={styles.countPill}>{t("editor.selected")}</span>}
                  </div>
                  <p className={styles.templateCardDescription}>{tpl.description}</p>
                  <div className={styles.templateCardActions}>
                    <a
                      className={`${styles.linkButton} ${styles.iconLabel}`}
                      href={`/pages/${tenantSlug}?template=${tpl.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <IconExternalLink size={13} />
                      {t("editor.preview")}
                    </a>
                    <button
                      type="button"
                      className={styles.linkButton}
                      onClick={() => update("templateId", tpl.id)}
                      disabled={active}
                    >
                      {active ? t("editor.inUse") : t("editor.useThisTemplate")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.iconLabel}>
            <IconGlobe size={16} />
            {t("editor.contentLanguage")}
          </span>
        </h2>
        <p className={styles.sectionHint}>{t("editor.contentLanguageHint")}</p>

        <div className={styles.detailField}>
          <label htmlFor="content-language">{t("editor.contentLanguage")}</label>
          <select
            id="content-language"
            value={form.language.code}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {!CONTENT_LANGUAGES.some((l) => l.code === form.language.code) && (
              // The agent picked a language outside our known list — keep it
              // selectable so saving the rest of the form doesn't silently
              // reset it to English.
              <option value={form.language.code}>{form.language.name}</option>
            )}
            {CONTENT_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("editor.heroCopy")}</h2>

        <div className={styles.detailField}>
          <label htmlFor="headline">{t("editor.headline")}</label>
          <input
            id="headline"
            value={form.headline}
            onChange={(e) => update("headline", e.target.value)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="headlineVariantB">{t("editor.headlineVariantB")}</label>
          <input
            id="headlineVariantB"
            placeholder={t("editor.headlineVariantBPlaceholder")}
            value={form.headlineVariantB}
            onChange={(e) => update("headlineVariantB", e.target.value)}
          />
          <span className={styles.sectionHint}>{t("editor.headlineVariantBHint")}</span>
          {form.headlineVariantB && variantCounts && (
            <p className={styles.sectionHint} style={{ marginTop: 4 }}>
              {t("editor.headlineVariantBResults", { a: variantCounts.a, b: variantCounts.b })}
            </p>
          )}
        </div>

        <div className={styles.detailField}>
          <label htmlFor="subheadline">{t("editor.subheadline")}</label>
          <textarea
            id="subheadline"
            rows={2}
            value={form.subheadline}
            onChange={(e) => update("subheadline", e.target.value)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="ctaLabel">{t("editor.ctaText")}</label>
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
          <span>{t("editor.showLogo")}</span>
        </label>

        {!hasLogo && (
          <p className={styles.sectionHint}>
            {t("editor.uploadLogoHintBefore")}{" "}
            <a href={`/t/${tenantSlug}/settings`}>{t("editor.settings")}</a>
            {t("editor.uploadLogoHintAfter")}
          </p>
        )}

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.showTeamSection}
            onChange={(e) => update("showTeamSection", e.target.checked)}
          />
          <span>{t("editor.showTeamSection")}</span>
        </label>
        <p className={styles.sectionHint}>{t("editor.showTeamSectionHint")}</p>
      </section>

      {/* ── Social links & quick messaging ──────────────────────────────
          Placed directly after the hero copy because that's where these
          render: a row of buttons under the CTA, mirrored in the footer. */}
      <section className={styles.detailCard} style={{ maxWidth: 760 }}>
        <h2 className={styles.sectionTitle}>{t("editor.socialTitle")}</h2>
        <p className={styles.sectionHint}>{t("editor.socialHint")}</p>

        <div className={styles.socialCallout}>
          <span className={styles.socialCalloutIcon} style={{ "--social-brand": "#25D366" }}>
            <SocialIcon platform="whatsapp" size={20} />
          </span>
          <div className={styles.socialCalloutBody}>
            <strong>{t("editor.whatsappTitle")}</strong>
            <p className={styles.sectionHint}>{t("editor.whatsappHint")}</p>

            <div className={styles.fieldRow}>
              <div className={styles.detailField}>
                <label htmlFor="whatsapp-number">{t("editor.whatsappNumber")}</label>
                <input
                  id="whatsapp-number"
                  type="tel"
                  dir="ltr"
                  inputMode="tel"
                  placeholder={t("editor.whatsappNumberPlaceholder")}
                  value={form.social.whatsapp.number}
                  onChange={(e) => updateWhatsapp("number", e.target.value)}
                />
                <span className={styles.sectionHint}>{t("editor.whatsappNumberHint")}</span>
              </div>

              <div className={styles.detailField}>
                <label htmlFor="whatsapp-message">{t("editor.whatsappMessage")}</label>
                <textarea
                  id="whatsapp-message"
                  rows={2}
                  maxLength={MAX_WHATSAPP_MESSAGE}
                  placeholder={DEFAULT_WHATSAPP_MESSAGE}
                  value={form.social.whatsapp.message}
                  onChange={(e) => updateWhatsapp("message", e.target.value)}
                />
                <span className={styles.sectionHint}>{t("editor.whatsappMessageHint")}</span>
              </div>
            </div>

            {/* Opens the real chat, pre-filled exactly as a visitor would
                see it — the only way to be sure the number is right. */}
            {isValidPhone(form.social.whatsapp.number) && (
              <a
                className={`${styles.linkButton} ${styles.iconLabel}`}
                href={whatsappUrl(form.social.whatsapp.number, form.social.whatsapp.message)}
                target="_blank"
                rel="noreferrer noopener"
              >
                <IconExternalLink size={13} />
                {t("editor.whatsappTest")}
              </a>
            )}
            {form.social.whatsapp.number && !isValidPhone(form.social.whatsapp.number) && (
              <p className={styles.sectionHint} style={{ color: "var(--danger-strong)" }}>
                {t("editor.whatsappInvalid")}
              </p>
            )}
          </div>
        </div>

        {SOCIAL_PLATFORMS.filter((p) => p.kind === "url").map((platform) => (
          <div className={styles.socialInputRow} key={platform.key}>
            <span className={styles.socialInputIcon} style={{ "--social-brand": platform.brandColor }}>
              <SocialIcon platform={platform.key} size={18} />
            </span>
            <div className={styles.detailField} style={{ marginBottom: 0, flex: 1 }}>
              {/* The platform's own name — identical in every language, so
                  it isn't a dictionary string. */}
              <label htmlFor={`social-${platform.key}`}>{platform.label}</label>
              <input
                id={`social-${platform.key}`}
                type="text"
                dir="ltr"
                placeholder={platform.prefix}
                value={form.social[platform.key]}
                onChange={(e) => updateSocial(platform.key, e.target.value)}
              />
            </div>
          </div>
        ))}

        <p className={styles.sectionHint}>{t("editor.socialHandleHint")}</p>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.showSocialInHero}
            onChange={(e) => update("showSocialInHero", e.target.checked)}
          />
          <span>{t("editor.showSocialInHero")}</span>
        </label>
        <p className={styles.sectionHint}>{t("editor.showSocialInHeroHint")}</p>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>{t("editor.backgroundPhotos")}</h2>
        <p className={styles.sectionHint}>
          {t("editor.backgroundPhotosHint", { n: MAX_BACKGROUNDS })}
        </p>

        <div className={styles.backgroundGrid}>
          {Array.from({ length: backgroundSlots }).map((_, slot) => (
            <ImageUpload
              key={slot}
              kind="background"
              value={form.backgroundMediaIds[slot] || null}
              onChange={(id) => setBackground(slot, id)}
              label={t("editor.photoN", { n: slot + 1 })}
              hint={t("editor.landscapeBest")}
              previewClassName={styles.backgroundPreview}
            />
          ))}
        </div>

        {form.backgroundMediaIds.length > 0 && (
          <div className={styles.detailField} style={{ marginTop: 12 }}>
            <label htmlFor="overlay">
              {t("editor.overlayLabel", { percent: Math.round(form.backgroundOverlay * 100) })}
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
              {t("editor.overlayHint")}
            </span>
          </div>
        )}
      </section>

      <section className={styles.detailCard} style={{ maxWidth: 760 }}>
        <h2 className={styles.sectionTitle}>
          {t("editor.photoGallery")}{" "}
          <span className={styles.countPill}>
            {form.galleryMediaIds.length}/{MAX_GALLERY}
          </span>
        </h2>
        <p className={styles.sectionHint}>
          {t("editor.photoGalleryHint", { n: MAX_GALLERY })}
        </p>

        <div className={styles.backgroundGrid}>
          {Array.from({ length: gallerySlots }).map((_, slot) => (
            <ImageUpload
              key={slot}
              kind="gallery"
              value={form.galleryMediaIds[slot] || null}
              onChange={(id) => setGalleryPhoto(slot, id)}
              label={t("editor.photoN", { n: slot + 1 })}
              previewClassName={styles.backgroundPreview}
            />
          ))}
        </div>

        {form.galleryMediaIds.length > 0 && (
          <div className={styles.detailField} style={{ marginTop: 12 }}>
            <span className={styles.iconPickerLabel}>{t("editor.gridColumns")}</span>
            <div className={styles.colorToggle} role="radiogroup" aria-label={t("editor.galleryColumns")}>
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
                  {t("editor.nColumns", { n })}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>
          {t("editor.formFieldsTitle")}{" "}
          <span className={styles.countPill}>
            {form.formFields.length}/{MAX_FORM_FIELDS}
          </span>
        </h2>
        <p className={styles.sectionHint}>{t("editor.formFieldsHint", { n: MAX_FORM_FIELDS })}</p>

        {form.formFields.map((field, index) => {
          const core = isCoreKey(field.key);
          const locked = field.key === "name";
          return (
            <div key={field.key}>
            <div className={styles.formFieldRow}>
              <input
                type="text"
                value={field.label}
                placeholder={t("editor.fieldLabelPlaceholder")}
                onChange={(e) => updateFormField(field.key, { label: e.target.value })}
              />

              <select
                className={styles.formFieldTypeSelect}
                value={field.type}
                disabled={core}
                onChange={(e) => changeFieldType(field.key, e.target.value)}
              >
                {FIELD_TYPES.map((typeKey) => (
                  <option key={typeKey} value={typeKey}>
                    {t(`editor.fieldTypes.${typeKey}`)}
                  </option>
                ))}
              </select>

              <label className={styles.formFieldRequired}>
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={locked}
                  onChange={(e) => updateFormField(field.key, { required: e.target.checked })}
                />
                {t("editor.fieldRequired")}
              </label>

              <div className={styles.formFieldActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => moveFormField(index, -1)}
                  disabled={index === 0}
                  aria-label={t("editor.moveFieldUp")}
                >
                  <IconChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => moveFormField(index, 1)}
                  disabled={index === form.formFields.length - 1}
                  aria-label={t("editor.moveFieldDown")}
                >
                  <IconChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => removeFormField(field.key)}
                  disabled={locked}
                  aria-label={t("editor.removeField")}
                >
                  <IconClose size={14} />
                </button>
              </div>
            </div>

            {/* A dropdown or checkbox group needs its answers listed. Only
                shown for those two types — every other field ignores them. */}
            {isChoiceType(field.type) && (
              <div className={styles.fieldOptions}>
                <span className={styles.fieldOptionsLabel}>
                  {field.type === "checkbox" ? t("editor.optionsCheckbox") : t("editor.optionsSelect")}
                </span>

                {field.options.map((option, optionIndex) => (
                  <div key={optionIndex} className={styles.fieldOptionRow}>
                    <input
                      type="text"
                      value={option}
                      placeholder={t("editor.optionPlaceholder")}
                      onChange={(e) => updateFieldOption(field.key, optionIndex, e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => removeFieldOption(field.key, optionIndex)}
                      disabled={field.options.length <= 1}
                      aria-label={t("editor.removeOption")}
                    >
                      <IconClose size={13} />
                    </button>
                  </div>
                ))}

                {field.options.length < MAX_FIELD_OPTIONS && (
                  <button
                    type="button"
                    className={`${styles.linkButton} ${styles.iconLabel}`}
                    onClick={() => addFieldOption(field.key)}
                  >
                    <IconPlus size={12} />
                    {t("editor.addOption")}
                  </button>
                )}
              </div>
            )}
            </div>
          );
        })}

        {form.formFields.length < MAX_FORM_FIELDS && (
          <button
            type="button"
            className={`${styles.linkButton} ${styles.iconLabel}`}
            onClick={addFormField}
          >
            <IconPlus size={13} />
            {t("editor.addField")}
          </button>
        )}

        <div className={styles.formSection} style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--border)" }}>
          <h3 className={styles.formSectionTitle}>{t("editor.statusMessages")}</h3>
          <p className={styles.formSectionHint}>{t("editor.statusMessagesHint")}</p>

          <div className={styles.fieldRow}>
            <div className={styles.detailField}>
              <label htmlFor="status-sending">{t("editor.statusSending")}</label>
              <input
                id="status-sending"
                value={form.statusMessages.sending}
                onChange={(e) => updateStatusMessage("sending", e.target.value)}
              />
            </div>
            <div className={styles.detailField}>
              <label htmlFor="status-success">{t("editor.statusSuccess")}</label>
              <input
                id="status-success"
                value={form.statusMessages.success}
                onChange={(e) => updateStatusMessage("success", e.target.value)}
              />
            </div>
            <div className={styles.detailField}>
              <label htmlFor="status-error">{t("editor.statusError")}</label>
              <input
                id="status-error"
                value={form.statusMessages.error}
                onChange={(e) => updateStatusMessage("error", e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>
          {t("editor.faqTitle")}{" "}
          <span className={styles.countPill}>
            {form.faq.filter((i) => i.question.trim() || i.answer.trim()).length}/{MAX_FAQ_ITEMS}
          </span>
        </h2>
        <p className={styles.sectionHint}>{t("editor.faqHint")}</p>

        <div className={styles.detailField}>
          <label htmlFor="faq-heading">{t("editor.faqHeading")}</label>
          <input
            id="faq-heading"
            placeholder={t("editor.faqHeadingPlaceholder")}
            value={form.faqHeading}
            onChange={(e) => update("faqHeading", e.target.value)}
          />
        </div>

        <button
          type="button"
          className={`${styles.linkButton} ${styles.iconLabel}`}
          onClick={generateFaq}
          disabled={faqGenerating}
        >
          <IconSparkles size={13} />
          {faqGenerating ? t("editor.faqGenerating") : t("editor.faqGenerate")}
        </button>
        <p className={styles.sectionHint}>{t("editor.faqGenerateHint")}</p>

        {form.faq.map((item, index) => (
          <div key={index} className={styles.faqRow}>
            <div className={styles.faqRowHeader}>
              <span className={styles.faqRowNumber}>{index + 1}</span>
              <div className={styles.formFieldActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => moveFaqItem(index, -1)}
                  disabled={index === 0}
                  aria-label={t("editor.moveFaqUp")}
                >
                  <IconChevronUp size={14} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => moveFaqItem(index, 1)}
                  disabled={index === form.faq.length - 1}
                  aria-label={t("editor.moveFaqDown")}
                >
                  <IconChevronDown size={14} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => removeFaqItem(index)}
                  aria-label={t("editor.removeFaq")}
                >
                  <IconClose size={14} />
                </button>
              </div>
            </div>

            <input
              placeholder={t("editor.faqQuestionPlaceholder")}
              value={item.question}
              onChange={(e) => updateFaq(index, "question", e.target.value)}
            />
            <textarea
              rows={3}
              maxLength={MAX_FAQ_ANSWER}
              placeholder={t("editor.faqAnswerPlaceholder")}
              value={item.answer}
              onChange={(e) => updateFaq(index, "answer", e.target.value)}
            />
            <span className={styles.charCount}>
              {item.answer.length}/{MAX_FAQ_ANSWER}
            </span>
          </div>
        ))}

        {form.faq.length < MAX_FAQ_ITEMS && (
          <button
            type="button"
            className={`${styles.linkButton} ${styles.iconLabel}`}
            onClick={addFaqItem}
          >
            <IconPlus size={13} />
            {t("editor.addFaq")}
          </button>
        )}
      </section>

      <section className={styles.detailCard}>
        <h2 className={styles.sectionTitle}>
          {t("editor.featureCards")}{" "}
          <span className={styles.countPill}>
            {form.features.length}/{MAX_FEATURES}
          </span>
        </h2>
        <p className={styles.sectionHint}>
          {t("editor.featureCardsHint", { n: MAX_FEATURES })}
        </p>

        {form.features.map((feature, index) => (
          <div key={index} className={styles.featureRow}>
            <input
              placeholder={t("editor.featureTitle")}
              value={feature.title}
              onChange={(e) => updateFeature(index, "title", e.target.value)}
            />
            <textarea
              rows={2}
              maxLength={MAX_DESCRIPTION}
              placeholder={t("editor.featureDescription")}
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
              <span className={styles.iconPickerLabel}>{t("editor.cardStyling")}</span>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={feature.topStrip}
                  onChange={(e) => updateFeature(index, "topStrip", e.target.checked)}
                />
                <span>{t("editor.colouredTopStrip")}</span>
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={feature.border}
                  onChange={(e) => updateFeature(index, "border", e.target.checked)}
                />
                <span>{t("editor.colouredBorder")}</span>
              </label>

              {/* The colour toggle is meaningless until one of the two is on. */}
              {(feature.topStrip || feature.border) && (
                <div className={styles.colorToggle} role="radiogroup" aria-label={t("editor.cardColour")}>
                  {[
                    ["primary", t("editor.colourPrimary"), theme?.primaryColor || "#2563eb"],
                    ["accent", t("editor.colourAccent"), theme?.accentColor || "#111827"],
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
              style={{ color: "var(--danger-strong)", alignSelf: "flex-start" }}
              onClick={() => removeFeature(index)}
              disabled={form.features.length <= 1}
            >
              <IconClose size={13} />
              {t("editor.removeFeature")}
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
            {t("editor.addFeature")}
          </button>
        )}
      </section>

      <div className={styles.actionsRow}>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={saving}>
          <IconCheck size={14} />
          {saving ? t("common.saving") : t("editor.saveChanges")}
        </button>
        <a
          className={`${styles.deleteButton} ${styles.iconLabel}`}
          style={{ color: "inherit", borderColor: "var(--border)" }}
          href={`/pages/${tenantSlug}`}
          target="_blank"
          rel="noreferrer"
        >
          <IconExternalLink size={14} />
          {t("editor.previewLandingPage")}
        </a>
        {saved && (
          <span className={styles.savedNote} role="status">
            {t("settings.saved")}
          </span>
        )}
      </div>
    </form>
  );
}

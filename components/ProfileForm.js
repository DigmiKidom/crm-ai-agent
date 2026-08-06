"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "./ImageUpload";
import Avatar from "./chrome/Avatar";
import { useT } from "@/components/i18n/LocaleProvider";
import styles from "./dashboard.module.css";

/**
 * The signed-in user's own profile: photo, name, job title, phone.
 *
 * Follows the same explicit-Save model as Settings and the landing page editor
 * — nothing commits until Save is pressed, with dirty-state driving the button.
 * The one exception is the avatar, which uploads immediately on pick (that's
 * what ImageUpload does everywhere) but isn't *attached* to the user until Save,
 * so cancelling out leaves the profile untouched.
 */
export default function ProfileForm({ user }) {
  const t = useT();
  const router = useRouter();

  const initial = {
    name: user.name || "",
    title: user.title || "",
    phone: user.phone || "",
    avatarMediaId: user.avatarMediaId || null,
  };

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty = Object.keys(initial).some((k) => form[k] !== initial[k]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t("profile.nameRequired"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || t("profile.saveFailed"));
        return;
      }

      setSaved(true);
      // The header avatar and the sidebar both read this from the server, so
      // the layout has to re-render for the new photo to show up.
      router.refresh();
    } catch {
      setError(t("profile.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.settingsForm} onSubmit={handleSave}>
      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <section className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>{t("profile.photo")}</h2>
        <p className={styles.sectionHint}>{t("profile.photoHint")}</p>

        <div className={styles.avatarEditRow}>
          <Avatar
            mediaId={form.avatarMediaId}
            name={form.name}
            email={user.email}
            size={72}
            alt={t("account.avatarAlt")}
          />
          <div className={styles.avatarEditControls}>
            <ImageUpload
              kind="avatar"
              value={form.avatarMediaId}
              onChange={(id) => update("avatarMediaId", id)}
              hint={t("profile.photoUploadHint")}
            />
          </div>
        </div>
      </section>

      <section className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>{t("profile.details")}</h2>

        <div className={styles.detailField}>
          <label htmlFor="profile-name">{t("profile.name")}</label>
          <input
            id="profile-name"
            required
            maxLength={80}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="profile-email">{t("profile.email")}</label>
          {/* Read-only: changing it would invalidate the verification state and
              the password-reset path, so it needs its own flow. */}
          <input id="profile-email" className="ltr" value={user.email} readOnly disabled />
          <span className={styles.fieldHint}>{t("profile.emailHint")}</span>
        </div>

        <div className={styles.detailField}>
          <label htmlFor="profile-title">{t("profile.jobTitle")}</label>
          <input
            id="profile-title"
            maxLength={120}
            placeholder={t("profile.jobTitlePlaceholder")}
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>

        <div className={styles.detailField}>
          <label htmlFor="profile-phone">{t("profile.phone")}</label>
          <input
            id="profile-phone"
            type="tel"
            dir="ltr"
            maxLength={40}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
      </section>

      <div className={styles.actionsRow}>
        <button className={styles.saveButton} type="submit" disabled={saving || !dirty}>
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {saved && !dirty && (
          <span className={styles.savedNote} role="status">
            {t("settings.saved")}
          </span>
        )}
      </div>
    </form>
  );
}

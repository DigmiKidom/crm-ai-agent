"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import { IconCheck, IconTrash, IconMail, IconSparkles } from "./icons";
import { useT } from "@/components/i18n/LocaleProvider";

export default function LeadDetailEditor({ lead, stages, tenantSlug }) {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({
    name: lead.name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    message: lead.message || "",
    notes: lead.notes || "",
    stage: lead.stage || stages[0],
  });
  // Answers to any custom fields the tenant added to their landing page form
  // (see components/LandingPageEditor.js). Snapshotted at submission time —
  // editable here like everything else, PATCHed back as a whole array.
  const [customFields, setCustomFields] = useState(lead.customFields || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // AI-drafted first response — deliberately separate state from the form
  // above: this is never saved onto the Lead document, only ever copied out
  // and sent by the owner from their own inbox ("AI proposes, human commits",
  // the same pattern as the CV builder's polish/summarize actions).
  const [draft, setDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleDraftReply() {
    setDraftLoading(true);
    setDraftError("");
    setCopied(false);

    const res = await fetch(`/api/leads/${lead._id}/reply-draft`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    setDraftLoading(false);

    if (!res.ok) {
      setDraftError(data.error || t("leads.draftFailed"));
      return;
    }
    setDraft(data.draft);
  }

  async function handleCopyDraft() {
    const text = `${t("leads.replyDraftSubject")}: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setDraftError(t("leads.copyFailed"));
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  function updateCustomField(key, value) {
    setCustomFields((fields) => fields.map((f) => (f.key === key ? { ...f, value } : f)));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/leads/${lead._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, customFields }),
    });

    setSaving(false);

    if (!res.ok) {
      setError(t("leads.saveFailed"));
      return;
    }
    setSaved(true);
  }

  async function handleDelete() {
    if (!confirm(t("leads.confirmDelete", { name: lead.name }))) return;

    setDeleting(true);
    const res = await fetch(`/api/leads/${lead._id}`, { method: "DELETE" });

    if (!res.ok) {
      setDeleting(false);
      setError(t("leads.deleteFailed"));
      return;
    }
    router.push(`/t/${tenantSlug}/leads`);
  }

  return (
    <form className={styles.detailCard} onSubmit={handleSave}>
      {error && (
        <p style={{ color: "var(--danger-strong)", marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}

      <div className={styles.detailField}>
        <label htmlFor="name">{t("leads.name")}</label>
        <input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
      </div>

      <div className={styles.detailField}>
        <label htmlFor="email">{t("leads.email")}</label>
        <input id="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
      </div>

      <div className={styles.detailField}>
        <label htmlFor="phone">{t("leads.phone")}</label>
        <input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      </div>

      <div className={styles.detailField}>
        <label htmlFor="stage">{t("leads.stage")}</label>
        <select id="stage" value={form.stage} onChange={(e) => update("stage", e.target.value)}>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.detailField}>
        <label htmlFor="message">{t("leads.originalMessage")}</label>
        <textarea
          id="message"
          rows={3}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
        />
      </div>

      <div className={styles.detailField}>
        <label>{t("leads.replyDraft")}</label>
        {!draft && (
          <button
            type="button"
            className={`${styles.linkButton} ${styles.iconLabel}`}
            onClick={handleDraftReply}
            disabled={draftLoading}
          >
            <IconSparkles size={14} />
            {draftLoading ? t("leads.draftingReply") : t("leads.draftReply")}
          </button>
        )}
        {draftError && (
          <p style={{ color: "var(--danger-strong)", marginTop: 8 }} role="alert">
            {draftError}
          </p>
        )}
        {draft && (
          <div className={styles.detailCard} style={{ marginTop: 8 }}>
            <div className={styles.detailField}>
              <label htmlFor="draftSubject" style={{ fontWeight: 400 }}>
                {t("leads.replyDraftSubject")}
              </label>
              <input
                id="draftSubject"
                value={draft.subject}
                onChange={(e) => {
                  setCopied(false);
                  setDraft((d) => ({ ...d, subject: e.target.value }));
                }}
              />
            </div>
            <div className={styles.detailField}>
              <label htmlFor="draftBody" style={{ fontWeight: 400 }}>
                {t("leads.replyDraftBody")}
              </label>
              <textarea
                id="draftBody"
                rows={6}
                dir={draft.language?.dir || "auto"}
                value={draft.body}
                onChange={(e) => {
                  setCopied(false);
                  setDraft((d) => ({ ...d, body: e.target.value }));
                }}
              />
            </div>
            <div className={styles.actionsRow} style={{ marginTop: 0 }}>
              <button
                type="button"
                className={`${styles.saveButton} ${styles.iconLabel}`}
                onClick={handleCopyDraft}
              >
                <IconMail size={14} />
                {t("leads.copyDraft")}
              </button>
              <button
                type="button"
                className={`${styles.linkButton} ${styles.iconLabel}`}
                onClick={handleDraftReply}
                disabled={draftLoading}
              >
                <IconSparkles size={14} />
                {draftLoading ? t("leads.draftingReply") : t("leads.regenerateDraft")}
              </button>
              {copied && (
                <span className={styles.savedNote} role="status">
                  {t("leads.draftCopied")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {customFields.length > 0 && (
        <div className={styles.detailField}>
          <label>{t("leads.customFields")}</label>
          {customFields.map((field) => (
            <div key={field.key} className={styles.detailField} style={{ marginBottom: 8 }}>
              <label htmlFor={`custom-${field.key}`} style={{ fontWeight: 400 }}>
                {field.label || field.key}
              </label>
              <input
                id={`custom-${field.key}`}
                value={field.value}
                onChange={(e) => updateCustomField(field.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div className={styles.detailField}>
        <label htmlFor="notes">{t("leads.notes")}</label>
        <textarea
          id="notes"
          rows={4}
          placeholder={t("leads.notesPlaceholder")}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      <div className={styles.actionsRow}>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={saving}>
          <IconCheck size={14} />
          {saving ? t("common.saving") : t("leads.saveChanges")}
        </button>
        <button
          type="button"
          className={`${styles.deleteButton} ${styles.iconLabel}`}
          onClick={handleDelete}
          disabled={deleting}
        >
          <IconTrash size={14} />
          {deleting ? t("leads.deleting") : t("leads.deleteLead")}
        </button>
        {saved && (
          <span className={styles.savedNote} role="status">
            {t("leads.saved")}
          </span>
        )}
      </div>
    </form>
  );
}

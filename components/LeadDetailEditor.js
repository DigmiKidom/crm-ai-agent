"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import { IconCheck, IconTrash, IconMail, IconSparkles } from "./icons";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { classifyStages } from "@/lib/stageClassifier";

const STATUS_TONE_CLASS = {
  won: "statusSuccess",
  lost: "statusDanger",
  open: "statusMuted",
};

export default function LeadDetailEditor({ lead, stages, tenantSlug, currency = "USD" }) {
  const t = useT();
  // The app's own locale, not the browser's. Passing `undefined` to
  // Intl.NumberFormat means "use the runtime default", which is the server's
  // locale during SSR and the visitor's during hydration — so a Hebrew user
  // got "$120" from the server and "‏120 ‏$" from the client, and React threw
  // a hydration mismatch on every render of this field.
  const { locale } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState({
    name: lead.name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    message: lead.message || "",
    notes: lead.notes || "",
    stage: lead.stage || stages[0],
    dealValue: lead.dealValue || 0,
  });
  const [dealStatus, setDealStatus] = useState(lead.dealStatus || "open");
  const dealValueRef = useRef(null);
  const [showWonPrompt, setShowWonPrompt] = useState(false);

  // Same classification Analytics and the server's own stage-change handler
  // use (app/api/leads/[id]/route.js) — so the badge and the deal-value nudge
  // below can never disagree with what actually gets saved.
  const { won: wonStages, lost: lostStages } = useMemo(() => classifyStages(stages), [stages]);
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

  function handleStageChange(newStage) {
    // Nudge toward entering a deal value the moment a lead crosses INTO a won
    // stage — not on every change to an already-won stage, which would just
    // be noise for a tenant with more than one winning stage.
    if (wonStages.has(newStage) && !wonStages.has(form.stage)) {
      setShowWonPrompt(true);
      // Deferred a tick so the input exists/is enabled by the time focus runs.
      setTimeout(() => dealValueRef.current?.focus(), 0);
    } else {
      setShowWonPrompt(false);
    }
    update("stage", newStage);
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

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(t("leads.saveFailed"));
      return;
    }
    // The server is the one source of truth for dealStatus (derived from
    // stage, never trusted from the client) — sync the badge to what it
    // actually saved rather than guessing locally.
    if (data.lead?.dealStatus) setDealStatus(data.lead.dealStatus);
    setShowWonPrompt(false);
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

      <span className={`${styles.statusBadge} ${styles[STATUS_TONE_CLASS[dealStatus]]}`}>
        {t(`leads.dealStatus.${dealStatus}`)}
      </span>

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

      <div className={styles.fieldRow}>
        <div className={styles.detailField}>
          <label htmlFor="stage">{t("leads.stage")}</label>
          <select id="stage" value={form.stage} onChange={(e) => handleStageChange(e.target.value)}>
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.detailField}>
          <label htmlFor="dealValue">{t("leads.dealValue")}</label>
          <input
            id="dealValue"
            ref={dealValueRef}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={form.dealValue}
            onChange={(e) => update("dealValue", e.target.value === "" ? 0 : Number(e.target.value))}
          />
          {form.dealValue > 0 && (
            <span className={styles.charCount}>
              {new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
                form.dealValue
              )}
            </span>
          )}
          {showWonPrompt && (
            <span className={styles.wonPrompt} role="status">
              {t("leads.wonDealValuePrompt")}
            </span>
          )}
        </div>
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

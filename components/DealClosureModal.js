"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconCheck, IconClose } from "@/components/icons";
import { MAX_CLOSURE_SERVICES, MAX_CLOSURE_NOTES } from "@/lib/dealClosure";
import styles from "./dashboard.module.css";

/** Today in the browser's own timezone, for a <input type="date"> default. */
function todayValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * The "how did this end" dialog, shown when a lead moves to won or lost.
 *
 * It asks for four things and blocks on none of them — an owner dragging a
 * card across a board at the end of the day should not be held hostage by a
 * form. Everything is optional except the amount on a won deal, which is the
 * one field the closed-deals log and revenue reporting genuinely cannot
 * reconstruct later.
 *
 * A lost deal is never asked for money. "How much did you not make" is both
 * unanswerable and slightly insulting; what's worth capturing there is why.
 */
export default function DealClosureModal({
  lead,
  outcome, // "won" | "lost"
  stage,
  currency = "USD",
  onCancel,
  onSaved,
}) {
  const t = useT();
  const isWon = outcome === "won";

  const [amount, setAmount] = useState(lead?.dealValue ? String(lead.dealValue) : "");
  const [services, setServices] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [closedAt, setClosedAt] = useState(todayValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onCancel?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, saving]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/leads/${lead._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          closure: {
            // A lost deal records nothing as revenue, whatever the lead was
            // previously valued at.
            amount: isWon ? amount : 0,
            services,
            resolutionNotes,
            closedAt,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("leads.closure.failed"));
        return;
      }
      onSaved?.(data.lead);
    } catch {
      setError(t("leads.closure.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel?.();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={isWon ? t("leads.closure.titleWon") : t("leads.closure.titleLost")}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className={styles.modalHeader}>
          <h2>{isWon ? t("leads.closure.titleWon") : t("leads.closure.titleLost")}</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onCancel}
            disabled={saving}
            aria-label={t("common.cancel")}
          >
            <IconClose size={14} />
          </button>
        </div>

        <p className={styles.sectionHint}>
          {isWon ? t("leads.closure.introWon", { name: lead.name }) : t("leads.closure.introLost", { name: lead.name })}
        </p>

        {error && <p className={styles.formError} role="alert">{error}</p>}

        <form onSubmit={handleSubmit}>
          {isWon && (
            <div className={styles.detailField}>
              <label htmlFor="closure-amount">
                {t("leads.closure.amount", { currency })}
              </label>
              <input
                id="closure-amount"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                dir="ltr"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className={styles.sectionHint}>{t("leads.closure.amountHint")}</span>
            </div>
          )}

          <div className={styles.detailField}>
            <label htmlFor="closure-services">
              {isWon ? t("leads.closure.services") : t("leads.closure.servicesLost")}
            </label>
            <input
              id="closure-services"
              maxLength={MAX_CLOSURE_SERVICES}
              autoFocus={!isWon}
              placeholder={isWon ? t("leads.closure.servicesPlaceholder") : ""}
              value={services}
              onChange={(e) => setServices(e.target.value)}
            />
          </div>

          <div className={styles.detailField}>
            <label htmlFor="closure-notes">
              {isWon ? t("leads.closure.notes") : t("leads.closure.notesLost")}
            </label>
            <textarea
              id="closure-notes"
              rows={3}
              maxLength={MAX_CLOSURE_NOTES}
              placeholder={isWon ? t("leads.closure.notesPlaceholder") : t("leads.closure.notesLostPlaceholder")}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
          </div>

          <div className={styles.detailField}>
            <label htmlFor="closure-date">{t("leads.closure.closedAt")}</label>
            <input
              id="closure-date"
              type="date"
              dir="ltr"
              // Backdating is normal — an owner catching up on Friday is
              // recording Tuesday's deal. Forward-dating is always a typo, so
              // the picker won't offer it and the server rejects it.
              max={todayValue()}
              value={closedAt}
              onChange={(e) => setClosedAt(e.target.value)}
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.linkButton} onClick={onCancel} disabled={saving}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className={`${styles.saveButton} ${styles.iconLabel}`}
              disabled={saving}
            >
              <IconCheck size={14} />
              {saving ? t("common.saving") : t("leads.closure.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

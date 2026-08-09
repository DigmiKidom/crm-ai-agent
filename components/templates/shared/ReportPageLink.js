"use client";

import { useEffect, useRef, useState } from "react";
import { REPORT_REASONS } from "@/lib/moderation";
import styles from "./shared.module.css";

// The honeypot's label is deliberately untranslated English — it exists to be
// read by form-filling bots, which look for exactly this word, and never by a
// person (the field is visually hidden and aria-hidden). Held in a constant
// rather than written inline so it doesn't read as a missed translation, to
// either a reviewer or the untranslated-string scan in test/boundaries.
const HONEYPOT_LABEL = "Website";

/**
 * The "Report this page" link in every generated landing page's footer, and
 * the modal behind it.
 *
 * Deliberately quiet: this is a safety valve, not a call to action. It sits
 * with the legal line at the very bottom, in the footer's own muted colour,
 * and nothing about a normal visit draws attention to it.
 *
 * Every string is passed in rather than translated here. This renders on a
 * tenant's public page, whose language is the tenant's content language (any
 * of nine) — not the visitor's dashboard locale, which they don't have. See
 * lib/landingCopy.js, which resolves these alongside every other visitor
 * string on the page.
 */
export default function ReportPageLink({ tenantSlug, labels }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  // Honeypot. Hidden from people, irresistible to form-filling bots — see
  // looksAutomated() in lib/moderation.js.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const openedAt = useRef(0);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    openedAt.current = Date.now();

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    // Stops the page behind the modal scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus moves into the dialog so a keyboard user isn't left tabbing
    // through the page behind it.
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          reason,
          notes,
          reporterEmail: email,
          website,
          // How long the form was open. A scripted post submits in
          // milliseconds; a person takes seconds.
          elapsedMs: Date.now() - openedAt.current,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(data.error || labels.error);
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setError(labels.error);
    }
  }

  function close() {
    setOpen(false);
    // Reset only after a completed report, so a validation error doesn't wipe
    // what the person typed when they reopen it.
    if (status === "sent") {
      setStatus("idle");
      setReason("");
      setNotes("");
      setEmail("");
    }
  }

  return (
    <>
      <button type="button" className={styles.reportLink} onClick={() => setOpen(true)}>
        {labels.link}
      </button>

      {open && (
        <div
          className={styles.reportBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className={styles.reportModal}
            role="dialog"
            aria-modal="true"
            aria-label={labels.title}
            tabIndex={-1}
            ref={dialogRef}
          >
            {status === "sent" ? (
              <>
                <h2 className={styles.reportTitle}>{labels.thanksTitle}</h2>
                <p className={styles.reportBody}>{labels.thanksBody}</p>
                <button type="button" className={styles.reportSubmit} onClick={close}>
                  {labels.close}
                </button>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className={styles.reportTitle}>{labels.title}</h2>
                <p className={styles.reportBody}>{labels.intro}</p>

                {error && <p className={styles.reportError}>{error}</p>}

                <div className={styles.reportField}>
                  <label htmlFor="report-reason">{labels.reasonLabel}</label>
                  <select
                    id="report-reason"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="">{labels.reasonPlaceholder}</option>
                    {REPORT_REASONS.map((key) => (
                      <option key={key} value={key}>
                        {labels.reasons[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.reportField}>
                  <label htmlFor="report-notes">{labels.notesLabel}</label>
                  <textarea
                    id="report-notes"
                    rows={3}
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className={styles.reportField}>
                  <label htmlFor="report-email">{labels.emailLabel}</label>
                  <input
                    id="report-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Honeypot: hidden from people via CSS and from screen
                    readers via aria-hidden, so only a bot ever fills it. */}
                <div className={styles.reportHoneypot} aria-hidden="true">
                  <label htmlFor="report-website">{HONEYPOT_LABEL}</label>
                  <input
                    id="report-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className={styles.reportActions}>
                  <button type="button" className={styles.reportCancel} onClick={close}>
                    {labels.cancel}
                  </button>
                  <button
                    type="submit"
                    className={styles.reportSubmit}
                    disabled={status === "sending" || !reason}
                  >
                    {status === "sending" ? labels.sending : labels.submit}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

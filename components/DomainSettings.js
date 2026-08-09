"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconCheck, IconAlert, IconClock, IconTrash } from "./icons";
import styles from "./dashboard.module.css";

const STATUS_ICON = { verified: IconCheck, pending: IconClock, error: IconAlert };
const STATUS_TONE = { verified: "var(--success)", pending: "var(--muted)", error: "var(--danger)" };

// Rendered only for owner/admin viewers, same as TeamSettings/BillingSettings.
export default function DomainSettings({ initialDomain }) {
  const t = useT();
  const [domain, setDomain] = useState(initialDomain);
  const [hostnameInput, setHostnameInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const res = await fetch("/api/tenant/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: hostnameInput.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error || t("settings.domain.addFailed"));
      return;
    }
    setDomain(data.customDomain);
    setHostnameInput("");
  }

  async function handleCheck() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/tenant/domain");
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error || t("settings.domain.checkFailed"));
      return;
    }
    setDomain(data.customDomain);
  }

  async function handleRemove() {
    if (!confirm(t("settings.domain.confirmRemove", { hostname: domain.hostname }))) return;
    setError("");
    setBusy(true);
    const res = await fetch("/api/tenant/domain", { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("settings.domain.removeFailed"));
      return;
    }
    setDomain(null);
  }

  const StatusIcon = domain ? STATUS_ICON[domain.status] : null;

  return (
    <section className={styles.detailCard}>
      <h2 className={styles.sectionTitle}>{t("settings.domain.title")}</h2>
      <p className={styles.sectionHint}>{t("settings.domain.hint")}</p>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      {domain?.hostname ? (
        <>
          <div className={styles.checkboxRow} style={{ marginBottom: 12 }}>
            {StatusIcon && <StatusIcon size={15} style={{ color: STATUS_TONE[domain.status] }} />}
            <strong>{domain.hostname}</strong>
            <span style={{ color: STATUS_TONE[domain.status], fontSize: "0.8rem" }}>
              {t(`settings.domain.status.${domain.status}`)}
            </span>
          </div>

          {domain.status !== "verified" && Array.isArray(domain.verification) && domain.verification.length > 0 && (
            <div className={styles.detailField}>
              <label>{t("settings.domain.dnsInstructions")}</label>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("settings.domain.recordType")}</th>
                    <th>{t("settings.domain.recordName")}</th>
                    <th>{t("settings.domain.recordValue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.verification.map((rec, i) => (
                    <tr key={i}>
                      <td>{rec.type}</td>
                      <td>{rec.domain}</td>
                      <td style={{ wordBreak: "break-all" }}>{rec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.sectionHint}>{t("settings.domain.dnsHint")}</p>
            </div>
          )}

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={`${styles.saveButton} ${styles.iconLabel}`}
              onClick={handleCheck}
              disabled={busy}
            >
              {busy ? t("common.loading") : t("settings.domain.checkStatus")}
            </button>
            <button
              type="button"
              className={`${styles.deleteButton} ${styles.iconLabel}`}
              onClick={handleRemove}
              disabled={busy}
            >
              <IconTrash size={14} />
              {t("settings.domain.remove")}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleAdd}>
          <div className={styles.detailField}>
            <label htmlFor="hostname">{t("settings.domain.hostnameLabel")}</label>
            <input
              id="hostname"
              placeholder={t("settings.domain.hostnamePlaceholder")}
              value={hostnameInput}
              onChange={(e) => setHostnameInput(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={busy}>
            {busy ? t("common.loading") : t("settings.domain.add")}
          </button>
        </form>
      )}
    </section>
  );
}

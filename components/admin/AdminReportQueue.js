"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconExternalLink } from "@/components/icons";
import styles from "./admin.module.css";

/**
 * The moderation queue.
 *
 * Two actions per row, and both are one click: dismiss (the report was wrong)
 * or ban (it wasn't). Banning takes the page down and closes every other open
 * report about it at the same time — see the API route.
 *
 * Neither action deletes anything. A reviewed report keeps its reason, its
 * reporter, and the note the admin left, because "why did this page come
 * down" is a question that gets asked weeks later.
 */
export default function AdminReportQueue({ rows = [] }) {
  const t = useT();
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function act(report, action) {
    if (action === "ban" && !window.confirm(t("admin.reports.banConfirm", { name: report.tenantName }))) {
      return;
    }

    const note = window.prompt(
      action === "ban" ? t("admin.reports.banNotePrompt") : t("admin.reports.dismissNotePrompt")
    );
    // Cancelling the note means cancelling the action — an empty string (they
    // pressed OK with nothing typed) is a deliberate "no comment" and goes
    // through.
    if (note === null) return;

    setBusyId(report.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("admin.actionFailed"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("admin.actionFailed"));
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return <p className={styles.empty}>{t("admin.reports.empty")}</p>;
  }

  return (
    <>
      {error && <p className={styles.error} style={{ margin: 14 }}>{error}</p>}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("admin.reports.filed")}</th>
            <th>{t("admin.reports.page")}</th>
            <th>{t("admin.reports.reason")}</th>
            <th>{t("admin.reports.notes")}</th>
            <th>{t("admin.reports.reporter")}</th>
            <th>{t("admin.users.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.pageBlocked ? styles.rowBlocked : ""}>
              <td className={styles.subtle} style={{ whiteSpace: "nowrap" }}>
                {row.createdAtLabel}
              </td>
              <td>
                <span className={styles.primaryCell}>
                  <strong>{row.tenantName}</strong>
                  <a
                    className={`${styles.subtle} ${styles.mono}`}
                    href={`/pages/${row.tenantSlug}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <IconExternalLink size={11} /> /{row.tenantSlug}
                  </a>
                  {row.pageBlocked && (
                    <span className={`${styles.pill} ${styles.pillDanger}`}>
                      {t("admin.users.statusBlocked")}
                    </span>
                  )}
                </span>
              </td>
              <td>
                <span className={styles.pill}>{t(`report.reasons.${row.reason}`)}</span>
              </td>
              <td style={{ maxWidth: 320 }}>{row.notes || <span className={styles.subtle}>—</span>}</td>
              <td className={styles.subtle}>
                <span className={styles.primaryCell}>
                  {row.reporterEmail && <span>{row.reporterEmail}</span>}
                  {/* Kept for triage: repeat reports from one address against
                      one page are a grudge, not a signal. */}
                  <span className={styles.mono}>{row.reporterIp || "—"}</span>
                </span>
              </td>
              <td>
                <span className={styles.rowActions}>
                  <a className={styles.button} href={`/admin/users/${row.tenantId}`}>
                    {t("admin.users.inspect")}
                  </a>
                  {row.status === "open" ? (
                    <>
                      <button
                        className={styles.button}
                        onClick={() => act(row, "dismiss")}
                        disabled={busyId === row.id}
                      >
                        {t("admin.reports.dismiss")}
                      </button>
                      <button
                        className={`${styles.button} ${styles.buttonDanger}`}
                        onClick={() => act(row, "ban")}
                        disabled={busyId === row.id}
                      >
                        {t("admin.reports.ban")}
                      </button>
                    </>
                  ) : (
                    <span className={styles.pill}>{t(`admin.reports.statuses.${row.status}`)}</span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

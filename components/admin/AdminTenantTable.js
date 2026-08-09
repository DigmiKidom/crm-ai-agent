"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconExternalLink } from "@/components/icons";
import styles from "./admin.module.css";

/**
 * The user/business management table.
 *
 * Client-side only for the action buttons — the rows themselves are rendered
 * on the server. Blocking a page asks for a reason first: a takedown that
 * nobody can later explain is a takedown that gets reversed by whoever picks
 * up the support email.
 */
export default function AdminTenantTable({ rows = [] }) {
  const t = useT();
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function toggleBlock(row) {
    const blocking = !row.pageBlocked;

    // window.prompt rather than a bespoke modal: this is an internal tool used
    // by a handful of people, and the reason is free text that lands in an
    // audit field. Not worth a component.
    const reason = blocking ? window.prompt(t("admin.users.blockReasonPrompt")) : "";
    if (blocking && reason === null) return;

    setBusyId(row.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/tenants/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageBlocked: blocking, reason: reason || "" }),
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

  async function toggleSuspend(row) {
    if (!row.owner) return;
    const suspending = !row.owner.suspended;

    if (suspending && !window.confirm(t("admin.users.suspendConfirm", { email: row.owner.email }))) {
      return;
    }

    setBusyId(row.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${row.owner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: suspending }),
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
    return <p className={styles.empty}>{t("admin.users.noResults")}</p>;
  }

  return (
    <>
      {error && <p className={styles.error} style={{ margin: 14 }}>{error}</p>}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("admin.users.business")}</th>
            <th>{t("admin.users.owner")}</th>
            <th>{t("admin.users.leads")}</th>
            <th>{t("admin.users.joined")}</th>
            <th>{t("admin.users.status")}</th>
            <th>{t("admin.users.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.pageBlocked ? styles.rowBlocked : ""}>
              <td>
                <span className={styles.primaryCell}>
                  <strong>{row.name}</strong>
                  <span className={`${styles.subtle} ${styles.mono}`}>/{row.slug}</span>
                  {row.customDomain && <span className={styles.subtle}>{row.customDomain}</span>}
                </span>
              </td>
              <td>
                {row.owner ? (
                  <span className={styles.primaryCell}>
                    <span>{row.owner.name || "—"}</span>
                    <span className={styles.subtle}>{row.owner.email}</span>
                  </span>
                ) : (
                  <span className={styles.subtle}>—</span>
                )}
              </td>
              <td>{row.leads}</td>
              <td className={styles.subtle}>{row.createdAtLabel}</td>
              <td>
                <span className={styles.rowActions}>
                  {row.pageBlocked && (
                    <span className={`${styles.pill} ${styles.pillDanger}`}>
                      {t("admin.users.statusBlocked")}
                    </span>
                  )}
                  {row.openReports > 0 && (
                    <span className={`${styles.pill} ${styles.pillWarn}`}>
                      {t("admin.users.statusReported", { n: row.openReports })}
                    </span>
                  )}
                  {row.owner?.suspended && (
                    <span className={`${styles.pill} ${styles.pillDanger}`}>
                      {t("admin.users.statusSuspended")}
                    </span>
                  )}
                  {!row.pageBlocked && !row.owner?.suspended && row.openReports === 0 && (
                    <span className={`${styles.pill} ${styles.pillOk}`}>
                      {t("admin.users.statusLive")}
                    </span>
                  )}
                </span>
              </td>
              <td>
                <span className={styles.rowActions}>
                  <a className={styles.button} href={`/admin/users/${row.id}`}>
                    {t("admin.users.inspect")}
                  </a>
                  <a
                    className={styles.button}
                    href={`/pages/${row.slug}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <IconExternalLink size={12} />
                    {t("admin.users.viewPage")}
                  </a>
                  <button
                    className={`${styles.button} ${row.pageBlocked ? "" : styles.buttonDanger}`}
                    onClick={() => toggleBlock(row)}
                    disabled={busyId === row.id}
                  >
                    {row.pageBlocked ? t("admin.users.unblockPage") : t("admin.users.blockPage")}
                  </button>
                  {row.owner && (
                    <button
                      className={`${styles.button} ${row.owner.suspended ? "" : styles.buttonDanger}`}
                      onClick={() => toggleSuspend(row)}
                      disabled={busyId === row.id}
                    >
                      {row.owner.suspended
                        ? t("admin.users.restoreAccount")
                        : t("admin.users.suspendAccount")}
                    </button>
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

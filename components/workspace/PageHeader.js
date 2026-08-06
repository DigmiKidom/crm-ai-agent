"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconTrash, IconCheck } from "@/components/icons";
import styles from "./workspace.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

/**
 * Shared header for both page types: an editable title, the save control, and
 * delete.
 *
 * The title is owned by the parent editor rather than by this component, so it
 * saves as part of the same batch as the page's content — nothing is written
 * until Save is pressed. Delete is the one exception: it's an explicit
 * destructive action, so it applies immediately.
 */
export default function PageHeader({
  tenantSlug,
  itemId,
  title,
  onTitleChange,
  dirty,
  status,
  onSave,
}) {
  const t = useT();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const res = await fetch(`/api/workspace/items/${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("workspace.deleteFailed"));
      setConfirming(false);
      return;
    }
    router.refresh();
    router.push(`/t/${tenantSlug}`);
  }

  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderTop}>
        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label={t("workspace.pageName")}
        />

        <div className={styles.headerActions}>
          {dirty ? (
            <span className={styles.savedNote} role="status">
              {t("workspace.unsavedChanges")}
            </span>
          ) : (
            status === "saved" && (
              <span className={`${styles.savedNote} ${styles.savedNoteOk}`} role="status">
                <IconCheck size={13} />
                Saved
              </span>
            )
          )}

          <button
            type="button"
            className={styles.saveButton}
            onClick={onSave}
            disabled={!dirty || status === "saving"}
          >
            {status === "saving" ? t("common.saving") : t("common.save")}
          </button>

          {confirming ? (
            <>
              <span className={styles.confirmText}>{t("workspace.deleteThisPage")}</span>
              <button type="button" className={styles.dangerButton} onClick={handleDelete}>
                Delete
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setConfirming(true)}
              title={t("workspace.deletePage")}
              aria-label={t("workspace.deletePage")}
            >
              <IconTrash size={15} />
            </button>
          )}
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
    </header>
  );
}

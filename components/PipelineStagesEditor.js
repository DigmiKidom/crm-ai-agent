"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import { IconChevronUp, IconChevronDown, IconClose, IconPlus, IconEdit } from "./icons";
import { useT } from "@/components/i18n/LocaleProvider";

let nextKey = 0;
function makeRow(name) {
  nextKey += 1;
  return { key: `row-${nextKey}`, original: name, name };
}

export default function PipelineStagesEditor({ tenantSlug, stages }) {
  const t = useT();
  const router = useRouter();
  const [rows, setRows] = useState(() => stages.map((s) => makeRow(s)));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function updateName(key, value) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, name: value } : r)));
    setSaved(false);
  }

  function moveRow(index, direction) {
    setRows((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  function addRow() {
    setRows((current) => [...current, makeRow("")]);
    setSaved(false);
  }

  function removeRow(key) {
    setRows((current) => current.filter((r) => r.key !== key));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const newStages = rows.map((r) => r.name.trim().toLowerCase());
    const renameMap = {};
    for (const r of rows) {
      const original = (r.original || "").trim().toLowerCase();
      const current = r.name.trim().toLowerCase();
      if (original && current && original !== current) {
        renameMap[original] = current;
      }
    }
    const survivingOriginals = new Set(rows.map((r) => (r.original || "").trim().toLowerCase()));
    const removed = stages
      .map((s) => s.trim().toLowerCase())
      .filter((s) => !survivingOriginals.has(s));

    const res = await fetch("/api/tenant/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stages: newStages, renameMap, removed }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: t("pipeline.serverError") };
    }

    setSaving(false);

    if (!res.ok) {
      setError(data.error || t("pipeline.saveFailed"));
      return;
    }

    setSaved(true);
    setRows(data.stages.map((s) => makeRow(s)));
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        className={styles.linkButton}
        style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
        onClick={() => setOpen(true)}
      >
        <IconEdit size={14} />
        {t("pipeline.editStages")}
      </button>
    );
  }

  return (
    <div className={styles.detailCard} style={{ maxWidth: 480, marginBottom: 24 }}>
      {error && (
        <p style={{ color: "#b91c1c", marginBottom: 12 }} role="alert">
          {error}
        </p>
      )}

      {rows.map((row, index) => (
        <div key={row.key} className={styles.stageRow}>
          <input value={row.name} onChange={(e) => updateName(row.key, e.target.value)} />
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => moveRow(index, -1)}
            disabled={index === 0}
            aria-label={t("pipeline.moveUp")}
          >
            <IconChevronUp size={14} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => moveRow(index, 1)}
            disabled={index === rows.length - 1}
            aria-label={t("pipeline.moveDown")}
          >
            <IconChevronDown size={14} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => removeRow(row.key)}
            disabled={rows.length <= 1}
            aria-label={t("pipeline.removeStage")}
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.linkButton}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          onClick={addRow}
        >
          <IconPlus size={13} />
          Add stage
        </button>
      </div>

      <div className={styles.actionsRow}>
        <button type="button" className={styles.saveButton} onClick={handleSave} disabled={saving}>
          {saving ? t("common.saving") : t("pipeline.saveStages")}
        </button>
        <button type="button" className={styles.deleteButton} style={{ color: "inherit", borderColor: "var(--border)" }} onClick={() => setOpen(false)}>
          Close
        </button>
        {saved && (
          <span className={styles.savedNote} role="status">
            {t("pipeline.saved")}
          </span>
        )}
      </div>
    </div>
  );
}

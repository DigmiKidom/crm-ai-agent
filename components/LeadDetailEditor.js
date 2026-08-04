"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";
import { IconCheck, IconTrash } from "./icons";

export default function LeadDetailEditor({ lead, stages, tenantSlug }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: lead.name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    message: lead.message || "",
    notes: lead.notes || "",
    stage: lead.stage || stages[0],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/leads/${lead._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Could not save changes.");
      return;
    }
    setSaved(true);
  }

  async function handleDelete() {
    if (!confirm(`Delete the lead "${lead.name}"? This can't be undone.`)) return;

    setDeleting(true);
    const res = await fetch(`/api/leads/${lead._id}`, { method: "DELETE" });

    if (!res.ok) {
      setDeleting(false);
      setError("Could not delete lead.");
      return;
    }
    router.push(`/t/${tenantSlug}/leads`);
  }

  return (
    <form className={styles.detailCard} onSubmit={handleSave}>
      {error && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>}

      <div className={styles.detailField}>
        <label htmlFor="name">Name</label>
        <input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
      </div>

      <div className={styles.detailField}>
        <label htmlFor="email">Email</label>
        <input id="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
      </div>

      <div className={styles.detailField}>
        <label htmlFor="phone">Phone</label>
        <input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      </div>

      <div className={styles.detailField}>
        <label htmlFor="stage">Stage</label>
        <select id="stage" value={form.stage} onChange={(e) => update("stage", e.target.value)}>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.detailField}>
        <label htmlFor="message">Original message</label>
        <textarea
          id="message"
          rows={3}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
        />
      </div>

      <div className={styles.detailField}>
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows={4}
          placeholder="Add internal notes about this lead..."
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
        />
      </div>

      <div className={styles.actionsRow}>
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={saving}>
          <IconCheck size={14} />
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          className={`${styles.deleteButton} ${styles.iconLabel}`}
          onClick={handleDelete}
          disabled={deleting}
        >
          <IconTrash size={14} />
          {deleting ? "Deleting..." : "Delete lead"}
        </button>
        {saved && <span className={styles.savedNote}>Saved</span>}
      </div>
    </form>
  );
}

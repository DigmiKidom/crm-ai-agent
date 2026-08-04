"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";
import { IconEdit, IconTrash, IconCheck, IconClose } from "./icons";

export default function ContactRow({ contact, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: contact.name || "",
    company: contact.company || "",
    email: contact.email || "",
    phone: contact.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/contacts/${contact._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (res.ok) {
      const data = await res.json();
      onUpdated(data.contact);
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete contact "${contact.name}"?`)) return;
    setDeleting(true);
    const res = await fetch(`/api/contacts/${contact._id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted(contact._id);
    } else {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <tr>
        <td>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </td>
        <td>
          <input
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </td>
        <td>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </td>
        <td>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </td>
        <td className={styles.rowActions}>
          <button className={`${styles.linkButton} ${styles.iconLabel}`} onClick={handleSave} disabled={saving}>
            <IconCheck size={13} />
            {saving ? "Saving..." : "Save"}
          </button>
          <button className={`${styles.linkButton} ${styles.iconLabel}`} onClick={() => setEditing(false)}>
            <IconClose size={13} />
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{contact.name}</td>
      <td>{contact.company || "—"}</td>
      <td>{contact.email || "—"}</td>
      <td>{contact.phone || "—"}</td>
      <td className={styles.rowActions}>
        <button className={`${styles.linkButton} ${styles.iconLabel}`} onClick={() => setEditing(true)}>
          <IconEdit size={13} />
          Edit
        </button>
        <button className={`${styles.linkButton} ${styles.iconLabel}`} onClick={handleDelete} disabled={deleting}>
          <IconTrash size={13} />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </td>
    </tr>
  );
}

"use client";

import { useEffect, useState } from "react";
import styles from "@/components/dashboard.module.css";
import ContactRow from "@/components/ContactRow";

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  async function loadContacts() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }

  useEffect(() => {
    loadContacts();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", company: "", email: "", phone: "" });
    setSaving(false);
    loadContacts();
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Contacts</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: 32, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <button type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add contact"}
        </button>
      </form>

      {loading ? (
        <p className={styles.empty}>Loading...</p>
      ) : contacts.length === 0 ? (
        <p className={styles.empty}>No contacts yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <ContactRow
                key={c._id}
                contact={c}
                onUpdated={(updated) =>
                  setContacts((current) =>
                    current.map((existing) => (existing._id === updated._id ? updated : existing))
                  )
                }
                onDeleted={(id) =>
                  setContacts((current) => current.filter((existing) => existing._id !== id))
                }
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

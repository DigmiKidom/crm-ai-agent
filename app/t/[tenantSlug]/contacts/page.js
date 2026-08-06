"use client";

import { useEffect, useState } from "react";
import styles from "@/components/dashboard.module.css";
import ContactRow from "@/components/ContactRow";
import { IconPlus, IconSearch } from "@/components/icons";
import { useT } from "@/components/i18n/LocaleProvider";

export default function ContactsPage() {
  const t = useT();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function loadContacts() {
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  }

  useEffect(() => {
    // Initial client-side data load on mount — a pre-existing pattern, not
    // part of the Phase 1 change this comment was added alongside.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const query = search.trim().toLowerCase();
  const filteredContacts = query
    ? contacts.filter((c) =>
        [c.name, c.company, c.email].some((field) => (field || "").toLowerCase().includes(query))
      )
    : contacts;

  return (
    <div>
      <h1 className={styles.pageTitle}>{t("contacts.title")}</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder={t("contacts.name")}
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder={t("contacts.company")}
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
        <input
          placeholder={t("contacts.email")}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder={t("contacts.phone")}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <button type="submit" className={`${styles.saveButton} ${styles.iconLabel}`} disabled={saving}>
          <IconPlus size={14} />
          {saving ? t("contacts.adding") : t("contacts.addContact")}
        </button>
      </form>

      {!loading && contacts.length > 0 && (
        <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
          <IconSearch
            size={15}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
          />
          <input
            placeholder={t("contacts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ display: "block", width: "100%", paddingLeft: 32 }}
          />
        </div>
      )}

      {loading ? (
        <p className={styles.empty}>{t("contacts.loading")}</p>
      ) : contacts.length === 0 ? (
        <p className={styles.empty}>{t("contacts.empty")}</p>
      ) : filteredContacts.length === 0 ? (
        <p className={styles.empty}>No contacts match &quot;{search}&quot;.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("contacts.name")}</th>
              <th>{t("contacts.company")}</th>
              <th>{t("contacts.email")}</th>
              <th>{t("contacts.phone")}</th>
              <th>{t("contacts.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((c) => (
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

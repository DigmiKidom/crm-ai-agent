"use client";

import { useCallback, useMemo, useState } from "react";
import { whatsappShareUrl } from "@/lib/socialLinks";
import { useT } from "@/components/i18n/LocaleProvider";
import { IconCheck, IconCopy, IconPlus, IconTrash, IconWhatsApp } from "@/components/icons";
import styles from "./plugins.module.css";
import dash from "@/components/dashboard.module.css";

export default function SnippetLibrary({ initialSnippets = [] }) {
  const t = useT();

  const [snippets, setSnippets] = useState(initialSnippets);
  const [form, setForm] = useState({ title: "", body: "", category: "" });
  const [filter, setFilter] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const categories = useMemo(
    () => [...new Set(snippets.map((s) => s.category).filter(Boolean))].sort(),
    [snippets]
  );

  const visible = useMemo(
    () => (filter ? snippets.filter((s) => s.category === filter) : snippets),
    [snippets, filter]
  );

  const request = useCallback(
    async (url, options) => {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("snippets.saveFailed"));
      return data;
    },
    [t]
  );

  // Best-effort: the count is a convenience for sorting, so a failed bump must
  // never surface as an error over a copy that actually worked.
  const recordUse = useCallback(
    (id) => {
      request(`/api/snippets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ used: true }),
      }).catch(() => {});
    },
    [request]
  );

  async function addSnippet(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await request("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSnippets((current) => [data.snippet, ...current]);
      setForm({ title: "", body: "", category: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(snippet) {
    setError("");
    try {
      // navigator.clipboard needs a secure context and can be refused outright;
      // failing loudly here is right, because the user pressed a button whose
      // entire job was to put text on their clipboard.
      await navigator.clipboard.writeText(snippet.body);
      setCopiedId(snippet._id);
      setTimeout(() => setCopiedId((id) => (id === snippet._id ? null : id)), 1600);
      recordUse(snippet._id);
    } catch {
      setError(t("snippets.copyFailed"));
    }
  }

  async function removeSnippet(snippet) {
    const previous = snippets;
    setSnippets((current) => current.filter((row) => row._id !== snippet._id));
    setError("");
    try {
      await request(`/api/snippets/${snippet._id}`, { method: "DELETE" });
    } catch (err) {
      setSnippets(previous);
      setError(err.message);
    }
  }

  return (
    <div className={styles.toolPage}>
      <form className={styles.composerStack} onSubmit={addSnippet}>
        <div className={styles.composer}>
          <input
            className={styles.composerInput}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder={t("snippets.titlePlaceholder")}
            aria-label={t("snippets.title")}
            maxLength={120}
          />
          <input
            className={styles.composerSelect}
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
            placeholder={t("snippets.categoryPlaceholder")}
            aria-label={t("snippets.category")}
            list="snippet-categories"
            maxLength={40}
          />
          <datalist id="snippet-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>
        <textarea
          className={styles.snippetInput}
          value={form.body}
          onChange={(event) => setForm({ ...form, body: event.target.value })}
          placeholder={t("snippets.bodyPlaceholder")}
          aria-label={t("snippets.body")}
          rows={3}
          maxLength={4000}
        />
        <button
          type="submit"
          className={dash.saveButton}
          disabled={busy || !form.title.trim() || !form.body.trim()}
        >
          <IconPlus size={15} />
          {t("snippets.add")}
        </button>
      </form>

      {error && (
        <p className={dash.formError} role="alert">
          {error}
        </p>
      )}

      {categories.length > 0 && (
        <div className={styles.filterRow} role="group" aria-label={t("snippets.category")}>
          <button
            type="button"
            className={styles.filterChip}
            data-active={filter === ""}
            onClick={() => setFilter("")}
          >
            {t("snippets.allCategories")}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={styles.filterChip}
              data-active={filter === category}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className={dash.empty}>{t("snippets.empty")}</p>
      ) : (
        <ul className={styles.snippetGrid}>
          {visible.map((snippet) => (
            <li key={snippet._id} className={styles.snippetCard}>
              <div className={styles.snippetHeader}>
                <h3 className={styles.snippetTitle}>{snippet.title}</h3>
                {snippet.category && (
                  <span className={styles.categoryTag}>{snippet.category}</span>
                )}
              </div>

              <p className={styles.snippetBody}>{snippet.body}</p>

              <div className={styles.snippetActions}>
                <button
                  type="button"
                  className={dash.linkButton}
                  onClick={() => copy(snippet)}
                >
                  {copiedId === snippet._id ? <IconCheck size={15} /> : <IconCopy size={15} />}
                  {copiedId === snippet._id ? t("snippets.copied") : t("snippets.copy")}
                </button>

                {/*
                  A plain <a>, not the locale-aware Link: this leaves the app
                  entirely. wa.me with no number opens WhatsApp's own contact
                  picker, which is the right behaviour for a template that
                  isn't addressed to anyone yet.
                */}
                <a
                  className={dash.whatsappButton}
                  href={whatsappShareUrl(snippet.body)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => recordUse(snippet._id)}
                >
                  <IconWhatsApp size={15} />
                  {t("snippets.sendWhatsApp")}
                </a>

                <button
                  type="button"
                  className={dash.iconButton}
                  onClick={() => removeSnippet(snippet)}
                  aria-label={`${t("common.delete")}: ${snippet.title}`}
                  title={t("common.delete")}
                >
                  <IconTrash size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { IconPlus, IconTrash } from "@/components/icons";
import styles from "./plugins.module.css";
import dash from "@/components/dashboard.module.css";

// How long the editor waits after the last keystroke before saving. Long
// enough that ordinary typing produces one write per pause rather than one per
// word; short enough that clicking away from a note practically never loses
// anything (the blur handler flushes too).
const AUTOSAVE_MS = 900;

/**
 * The internal scratchpad: a list of notes on one side, a markdown editor on
 * the other.
 *
 * Everything here stays inside the app by construction. There is no share
 * control, no recipient field and no export — the tool exists to be the place
 * a business writes things down for itself, and the moment it grows a "send"
 * button it has become mail with worse deliverability. See lib/models/Note.js.
 */
export default function NotesBoard({ initialNotes = [], initialNote = null }) {
  const t = useT();
  const { locale } = useLocale();

  const [notes, setNotes] = useState(initialNotes);
  // The page loads the first note's body along with the list, so the editor has
  // something in it on the first paint instead of fetching after mount and
  // flashing an empty pane.
  const [activeId, setActiveId] = useState(initialNote?._id ?? null);
  const [draft, setDraft] = useState({
    title: initialNote?.title ?? "",
    body: initialNote?.body ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  const saveTimer = useRef(null);
  // The value the pending save should write. Only ever assigned from event
  // handlers and async callbacks, never during render — a ref written while
  // rendering is invisible to React and can hold a value the UI never showed.
  const draftRef = useRef({ title: initialNote?.title ?? "", body: initialNote?.body ?? "" });

  const request = useCallback(
    async (url, options) => {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("notes.saveFailed"));
      return data;
    },
    [t]
  );

  const openNote = useCallback(
    async (id) => {
      setActiveId(id);
      setPreview(false);
      setError("");
      setLoading(true);
      try {
        // Bodies aren't in the list payload (see the API route), so opening a
        // note fetches exactly the one being read.
        const data = await request(`/api/notes/${id}`);
        const next = { title: data.note.title ?? "", body: data.note.body ?? "" };
        draftRef.current = next;
        setDraft(next);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [request]
  );

  const persist = useCallback(
    async (id, next) => {
      if (!id) return;
      try {
        const data = await request(`/api/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        setNotes((current) =>
          current.map((note) =>
            note._id === id
              ? { ...note, title: data.note.title, updatedAt: data.note.updatedAt }
              : note
          )
        );
        setStatus(t("notes.saved"));
      } catch (err) {
        setError(err.message);
      }
    },
    [request, t]
  );

  function edit(patch) {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
    setStatus(t("notes.saving"));
    setError("");

    clearTimeout(saveTimer.current);
    const id = activeId;
    saveTimer.current = setTimeout(() => persist(id, next), AUTOSAVE_MS);
  }

  // Leaving the field shouldn't wait out the timer — someone who types and
  // immediately clicks another note expects the first one to be saved.
  function flush() {
    if (!saveTimer.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    persist(activeId, draftRef.current);
  }

  async function createNote() {
    setError("");
    try {
      const data = await request("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t("notes.untitled"), body: "" }),
      });
      setNotes((current) => [data.note, ...current]);
      setActiveId(data.note._id);
      draftRef.current = { title: data.note.title, body: "" };
      setDraft(draftRef.current);
      setPreview(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeNote(id) {
    const previous = notes;
    setNotes((current) => current.filter((note) => note._id !== id));
    if (id === activeId) {
      setActiveId(null);
      draftRef.current = { title: "", body: "" };
      setDraft(draftRef.current);
    }
    try {
      await request(`/api/notes/${id}`, { method: "DELETE" });
    } catch (err) {
      setNotes(previous);
      setError(err.message);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className={styles.toolPage}>
      {error && (
        <p className={dash.formError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.splitPane}>
        <aside className={styles.paneList}>
          <button type="button" className={dash.saveButton} onClick={createNote}>
            <IconPlus size={15} />
            {t("notes.new")}
          </button>

          {notes.length === 0 ? (
            <p className={dash.empty}>{t("notes.empty")}</p>
          ) : (
            <ul className={styles.noteList}>
              {notes.map((note) => (
                <li key={note._id}>
                  <button
                    type="button"
                    className={styles.noteRow}
                    data-active={note._id === activeId}
                    onClick={() => openNote(note._id)}
                  >
                    <span className={styles.noteRowTitle}>
                      {note.title || t("notes.untitled")}
                    </span>
                    <span className={styles.noteRowDate}>
                      {dateFormatter.format(new Date(note.updatedAt))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={styles.paneEditor}>
          {!activeId ? (
            <p className={dash.empty}>{t("notes.selectPrompt")}</p>
          ) : (
            <>
              <div className={styles.editorHeader}>
                <input
                  className={styles.noteTitleInput}
                  value={draft.title}
                  onChange={(event) => edit({ title: event.target.value })}
                  onBlur={flush}
                  placeholder={t("notes.titlePlaceholder")}
                  aria-label={t("notes.titlePlaceholder")}
                  maxLength={160}
                />
                <div className={styles.editorActions}>
                  <button
                    type="button"
                    className={dash.linkButton}
                    onClick={() => setPreview((value) => !value)}
                    aria-pressed={preview}
                  >
                    {preview ? t("notes.edit") : t("notes.preview")}
                  </button>
                  <button
                    type="button"
                    className={dash.iconButton}
                    onClick={() => removeNote(activeId)}
                    aria-label={t("common.delete")}
                    title={t("common.delete")}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>

              {loading ? (
                <p className={dash.empty}>{t("common.loading")}</p>
              ) : preview ? (
                // Rendered with the app's own markdown renderer, which returns
                // escaped HTML — the note body is tenant-authored, but "the
                // people who can write here are trusted" is not a reason to
                // hand raw input to dangerouslySetInnerHTML.
                <div
                  className={styles.notePreview}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.body) }}
                />
              ) : (
                <textarea
                  className={styles.noteEditor}
                  value={draft.body}
                  onChange={(event) => edit({ body: event.target.value })}
                  onBlur={flush}
                  placeholder={t("notes.bodyPlaceholder")}
                  aria-label={t("notes.bodyPlaceholder")}
                  rows={18}
                />
              )}

              <p className={styles.toolMeta} aria-live="polite">
                {status}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

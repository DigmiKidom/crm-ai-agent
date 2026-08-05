"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "./PageHeader";
import { renderMarkdown } from "@/lib/markdown";
import styles from "./workspace.module.css";

const VIEWS = [
  ["write", "Write"],
  ["split", "Split"],
  ["preview", "Preview"],
];

export default function DocEditor({ tenantSlug, itemId, initialTitle, initialContent }) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  // The last state actually persisted. Everything compares against this to
  // decide whether there's anything to save.
  const [saved, setSaved] = useState({ title: initialTitle, content: initialContent });
  const [view, setView] = useState("split");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState("");

  const dirty = title !== saved.title || content !== saved.content;

  const save = useCallback(async () => {
    const next = { title: title.trim() || saved.title, content };

    setStatus("saving");
    const res = await fetch(`/api/workspace/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save.");
      setStatus("error");
      return;
    }

    setTitle(next.title);
    setSaved(next);
    setError("");
    setStatus("saved");
    // Pick up the (possibly renamed) page in the sidebar.
    router.refresh();
  }, [itemId, title, content, saved.title, router]);

  // Cmd/Ctrl+S is muscle memory in any editor — without this it triggers the
  // browser's own save-page dialog.
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dirty, save]);

  // Now that saving is manual, closing the tab mid-edit would lose the work
  // silently. This is the browser-level guard; see the note in my summary
  // about in-app navigation, which this can't catch.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return (
    <div className={styles.page}>
      <PageHeader
        tenantSlug={tenantSlug}
        itemId={itemId}
        title={title}
        onTitleChange={setTitle}
        dirty={dirty}
        status={status}
        onSave={save}
      />

      <div className={styles.viewToggle} role="tablist" aria-label="Editor view">
        {VIEWS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            className={`${styles.viewToggleOption} ${
              view === value ? styles.viewToggleOptionActive : ""
            }`}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={`${styles.docBody} ${view === "split" ? styles.docBodySplit : ""}`}>
        {view !== "preview" && (
          <textarea
            className={styles.docTextarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"# Heading\n\nWrite in markdown — **bold**, *italic*, `code`, [links](https://example.com), lists and quotes all work."}
            spellCheck
          />
        )}

        {view !== "write" && (
          <div className={styles.docPreview}>
            {content.trim() ? (
              renderMarkdown(content, styles)
            ) : (
              <p className={styles.docPlaceholder}>Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

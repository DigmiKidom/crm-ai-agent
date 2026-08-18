"use client";

import { useCallback, useMemo, useState } from "react";
import { TASK_PRIORITIES } from "@/lib/tasks";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { IconPlus, IconTrash } from "@/components/icons";
import styles from "./plugins.module.css";
import dash from "@/components/dashboard.module.css";

/** The task's due date as YYYY-MM-DD, which is what <input type="date"> wants. */
function dateInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * Overdue is compared against today's UTC date, matching how due dates are
 * stored (see dateOnly in lib/apiInput.js). Comparing against `now` instead
 * would mark a task due today as overdue from midnight onwards.
 */
function isOverdue(task) {
  if (!task.dueDate || task.done) return false;
  return dateInputValue(task.dueDate) < new Date().toISOString().slice(0, 10);
}

export default function TaskList({ initialTasks = [] }) {
  const t = useT();
  const { locale } = useLocale();

  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }),
    [locale]
  );

  const openCount = tasks.filter((task) => !task.done).length;

  const request = useCallback(
    async (url, options) => {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("tasks.saveFailed"));
      return data;
    },
    [t]
  );

  async function addTask(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError("");
    try {
      const data = await request("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, priority, dueDate: dueDate || null }),
      });
      setTasks((current) => [data.task, ...current]);
      setTitle("");
      setDueDate("");
      setPriority("normal");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Ticking a checkbox has to feel instant, so the row flips first and the
  // request follows. A failure puts the old value back rather than leaving the
  // list showing something the server disagrees with.
  async function toggleDone(task) {
    const previous = tasks;
    setTasks((current) =>
      current.map((row) => (row._id === task._id ? { ...row, done: !row.done } : row))
    );
    setError("");

    try {
      await request(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !task.done }),
      });
    } catch (err) {
      setTasks(previous);
      setError(err.message);
    }
  }

  async function removeTask(task) {
    const previous = tasks;
    setTasks((current) => current.filter((row) => row._id !== task._id));
    setError("");

    try {
      await request(`/api/tasks/${task._id}`, { method: "DELETE" });
    } catch (err) {
      setTasks(previous);
      setError(err.message);
    }
  }

  return (
    <div className={styles.toolPage}>
      <form className={styles.composer} onSubmit={addTask}>
        <input
          className={styles.composerInput}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("tasks.newPlaceholder")}
          aria-label={t("tasks.newPlaceholder")}
          maxLength={200}
        />

        <select
          className={styles.composerSelect}
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          aria-label={t("tasks.priority")}
        >
          {TASK_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {t(`tasks.priorities.${value}`)}
            </option>
          ))}
        </select>

        {/*
          dir="ltr" on the date field: the control renders its own
          day/month/year segments, and those stay left-to-right even inside a
          Hebrew page — the same treatment emails and phone numbers get
          elsewhere in the app.
        */}
        <input
          type="date"
          dir="ltr"
          className={styles.composerDate}
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-label={t("tasks.dueDate")}
        />

        <button type="submit" className={dash.saveButton} disabled={busy || !title.trim()}>
          <IconPlus size={15} />
          {t("tasks.add")}
        </button>
      </form>

      {error && (
        <p className={dash.formError} role="alert">
          {error}
        </p>
      )}

      <p className={styles.toolMeta}>
        {openCount === 1 ? t("tasks.openOne") : t("tasks.openMany", { count: openCount })}
      </p>

      {tasks.length === 0 ? (
        <p className={dash.empty}>{t("tasks.empty")}</p>
      ) : (
        <ul className={styles.taskList}>
          {tasks.map((task) => (
            <li key={task._id} className={styles.taskRow} data-done={task.done}>
              <label className={styles.taskCheck}>
                <input
                  type="checkbox"
                  checked={Boolean(task.done)}
                  onChange={() => toggleDone(task)}
                  aria-label={task.title}
                />
                <span className={styles.taskTitle}>{task.title}</span>
              </label>

              <span className={styles.taskTags}>
                {task.priority !== "normal" && (
                  <span className={styles.priorityTag} data-priority={task.priority}>
                    {t(`tasks.priorities.${task.priority}`)}
                  </span>
                )}
                {task.dueDate && (
                  <span className={styles.dueTag} data-overdue={isOverdue(task)}>
                    {dateFormatter.format(new Date(task.dueDate))}
                  </span>
                )}
              </span>

              <button
                type="button"
                className={dash.iconButton}
                onClick={() => removeTask(task)}
                aria-label={`${t("common.delete")}: ${task.title}`}
                title={t("common.delete")}
              >
                <IconTrash size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

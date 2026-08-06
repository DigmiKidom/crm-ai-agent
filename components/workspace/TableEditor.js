"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "./PageHeader";
import { IconPlus, IconTrash, IconClose, IconChevronDown } from "@/components/icons";
import styles from "./workspace.module.css";
import { useT } from "@/components/i18n/LocaleProvider";

// Values are persisted on the column; only the label is translated.
const COLUMN_TYPES = ["text", "number", "date", "select", "checkbox"];

const MAX_COLUMNS = 12;
const MAX_ROWS = 500;

// Column ids only need to be unique within one table, and they're generated
// client-side so a new column can be typed into before it's ever saved.
function newColumnId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// New rows carry a temporary id until the server hands back a real one. The
// prefix is what tells the save payload which rows are new.
let tempCounter = 0;
function newTempId() {
  return `tmp-${++tempCounter}`;
}

function emptyFor(column) {
  return column.type === "checkbox" ? false : "";
}

// Cheap deep-equality for the dirty check. The shapes here are plain JSON, and
// both sides are built in the same key order, so stringify is reliable enough
// and far simpler than a recursive compare.
function snapshot(title, columns, rows) {
  return JSON.stringify({ title, columns, rows });
}

export default function TableEditor({
  tenantSlug,
  itemId,
  initialTitle,
  initialColumns,
  initialRows,
}) {
  const t = useT();
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState(initialRows);
  const [savedSnapshot, setSavedSnapshot] = useState(
    snapshot(initialTitle, initialColumns, initialRows)
  );
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [editingColumn, setEditingColumn] = useState(null);
  const [sort, setSort] = useState({ columnId: null, dir: "asc" });

  const dirty = snapshot(title, columns, rows) !== savedSnapshot;

  const save = useCallback(async () => {
    setStatus("saving");
    setError("");

    const nextTitle = title.trim() || initialTitle;

    // Columns go first: the rows endpoint coerces every cell against the
    // table's stored columns, so it has to see the new shape before the rows
    // arrive or a retyped column would coerce against its old type.
    const itemRes = await fetch(`/api/workspace/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle, columns }),
    });

    if (!itemRes.ok) {
      const data = await itemRes.json().catch(() => ({}));
      setError(data.error || t("workspace.tableSaveFailed"));
      setStatus("error");
      return;
    }

    const rowsRes = await fetch(`/api/workspace/items/${itemId}/rows`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Temporary ids are stripped so the server treats those as new rows.
        rows: rows.map((r) => ({
          _id: String(r._id).startsWith("tmp-") ? undefined : r._id,
          cells: r.cells,
        })),
      }),
    });

    if (!rowsRes.ok) {
      const data = await rowsRes.json().catch(() => ({}));
      setError(data.error || t("workspace.rowsSaveFailed"));
      setStatus("error");
      return;
    }

    const data = await rowsRes.json();
    // Swap temporary ids for the real ones the server assigned.
    setTitle(nextTitle);
    setRows(data.rows);
    setSavedSnapshot(snapshot(nextTitle, columns, data.rows));
    setStatus("saved");
    router.refresh();
  }, [itemId, title, initialTitle, columns, rows, router, t]);

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

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /* ── Local-only mutations. Nothing here touches the network. ───────────── */

  function addColumn() {
    if (columns.length >= MAX_COLUMNS) return;
    const column = {
      id: newColumnId(),
      name: `Column ${columns.length + 1}`,
      type: "text",
      options: [],
    };
    setColumns((cs) => [...cs, column]);
    // Give every existing row a blank value for the new column so the grid
    // stays rectangular before the next save.
    setRows((rs) => rs.map((r) => ({ ...r, cells: { ...r.cells, [column.id]: emptyFor(column) } })));
  }

  function updateColumn(id, patch) {
    const current = columns.find((c) => c.id === id);
    if (!current) return;

    const next = { ...current, ...patch };
    setColumns((cs) => cs.map((c) => (c.id === id ? next : c)));

    // Retyping invalidates the old values, so blank the column rather than
    // leave text sitting in a number field until the server rejects it. This
    // deliberately sits outside the setColumns updater — updaters have to stay
    // pure, and React double-invokes them in StrictMode.
    if (patch.type && patch.type !== current.type) {
      setRows((rs) => rs.map((r) => ({ ...r, cells: { ...r.cells, [id]: emptyFor(next) } })));
    }
  }

  function removeColumn(id) {
    if (columns.length <= 1) return;
    setColumns((cs) => cs.filter((c) => c.id !== id));
    setRows((rs) =>
      rs.map((r) => {
        const cells = { ...r.cells };
        delete cells[id];
        return { ...r, cells };
      })
    );
    setEditingColumn(null);
    if (sort.columnId === id) setSort({ columnId: null, dir: "asc" });
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    setRows((rs) => [
      ...rs,
      {
        _id: newTempId(),
        cells: Object.fromEntries(columns.map((c) => [c.id, emptyFor(c)])),
      },
    ]);
  }

  function removeRow(rowId) {
    setRows((rs) => rs.filter((r) => r._id !== rowId));
  }

  function setCell(rowId, columnId, value) {
    setRows((rs) =>
      rs.map((r) => (r._id === rowId ? { ...r, cells: { ...r.cells, [columnId]: value } } : r))
    );
  }

  function toggleSort(columnId) {
    setSort((s) =>
      s.columnId === columnId
        ? { columnId, dir: s.dir === "asc" ? "desc" : "asc" }
        : { columnId, dir: "asc" }
    );
  }

  // Sorting is display-only — it never reorders the underlying rows, so saving
  // while sorted doesn't rewrite the order they were entered in.
  const visibleRows = useMemo(() => {
    if (!sort.columnId) return rows;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column) return rows;

    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = a.cells?.[column.id];
      const y = b.cells?.[column.id];

      // Blanks always sink to the bottom regardless of direction — a column
      // sorted ascending that leads with ten empty cells is useless.
      const xEmpty = x === "" || x === null || x === undefined;
      const yEmpty = y === "" || y === null || y === undefined;
      if (xEmpty && yEmpty) return 0;
      if (xEmpty) return 1;
      if (yEmpty) return -1;

      if (column.type === "number") return (Number(x) - Number(y)) * factor;
      if (column.type === "checkbox") return (Number(Boolean(x)) - Number(Boolean(y))) * factor;
      return String(x).localeCompare(String(y), undefined, { numeric: true }) * factor;
    });
  }, [rows, columns, sort]);

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

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={styles.th}>
                  <div className={styles.thInner}>
                    <button
                      type="button"
                      className={styles.thSort}
                      onClick={() => toggleSort(column.id)}
                      title={t("workspace.sortByColumn")}
                    >
                      {column.name}
                      {sort.columnId === column.id && (
                        <span className={styles.sortArrow}>
                          {sort.dir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.thMenu}
                      onClick={() =>
                        setEditingColumn(editingColumn === column.id ? null : column.id)
                      }
                      title={t("workspace.editColumn")}
                      aria-label={`Edit column ${column.name}`}
                    >
                      <IconChevronDown size={13} />
                    </button>
                  </div>

                  {editingColumn === column.id && (
                    <ColumnMenu
                      column={column}
                      canDelete={columns.length > 1}
                      onChange={(patch) => updateColumn(column.id, patch)}
                      onDelete={() => removeColumn(column.id)}
                      onClose={() => setEditingColumn(null)}
                    />
                  )}
                </th>
              ))}
              <th className={`${styles.th} ${styles.thAdd}`}>
                <button
                  type="button"
                  onClick={addColumn}
                  disabled={columns.length >= MAX_COLUMNS}
                  title={
                    columns.length >= MAX_COLUMNS
                      ? t("workspace.columnLimit", { max: MAX_COLUMNS })
                      : t("workspace.addColumn")
                  }
                  aria-label={t("workspace.addColumn")}
                >
                  <IconPlus size={14} />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => (
              <tr key={row._id}>
                {columns.map((column) => (
                  <td key={column.id} className={styles.td}>
                    <Cell
                      column={column}
                      value={row.cells?.[column.id]}
                      onChange={(v) => setCell(row._id, column.id, v)}
                    />
                  </td>
                ))}
                <td className={`${styles.td} ${styles.tdActions}`}>
                  <button
                    type="button"
                    onClick={() => removeRow(row._id)}
                    title={t("workspace.deleteRow")}
                    aria-label={t("workspace.deleteRow")}
                  >
                    <IconTrash size={14} />
                  </button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className={styles.emptyCell} colSpan={columns.length + 1}>
                  {t("workspace.noRows")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className={styles.addRowButton}
        onClick={addRow}
        disabled={rows.length >= MAX_ROWS}
        title={rows.length >= MAX_ROWS ? `Limit of ${MAX_ROWS} rows reached` : undefined}
      >
        <IconPlus size={14} />
        Add row
      </button>
    </div>
  );
}

/** The per-column settings popover: rename, retype, select options, delete. */
function ColumnMenu({ column, canDelete, onChange, onDelete, onClose }) {
  const t = useT();
  const [optionDraft, setOptionDraft] = useState("");

  function addOption() {
    const value = optionDraft.trim();
    if (!value || column.options?.includes(value)) return;
    onChange({ options: [...(column.options || []), value] });
    setOptionDraft("");
  }

  return (
    <div className={styles.columnMenu}>
      <div className={styles.columnMenuRow}>
        <label>{t("workspace.name")}</label>
        <input
          value={column.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </div>

      <div className={styles.columnMenuRow}>
        <label>{t("workspace.type")}</label>
        <select value={column.type} onChange={(e) => onChange({ type: e.target.value })}>
          {COLUMN_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`workspace.colType.${value}`)}
            </option>
          ))}
        </select>
        <p className={styles.columnMenuHint}>{t("workspace.typeChangeWarning")}</p>
      </div>

      {column.type === "select" && (
        <div className={styles.columnMenuRow}>
          <label>{t("workspace.options")}</label>
          <div className={styles.optionList}>
            {(column.options || []).map((option) => (
              <span className={styles.optionChip} key={option}>
                {option}
                <button
                  type="button"
                  onClick={() =>
                    onChange({ options: column.options.filter((o) => o !== option) })
                  }
                  aria-label={`Remove option ${option}`}
                >
                  <IconClose size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className={styles.optionAdd}>
            <input
              value={optionDraft}
              placeholder={t("workspace.addOption")}
              onChange={(e) => setOptionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
            />
            <button type="button" onClick={addOption}>
              Add
            </button>
          </div>
          <p className={styles.columnMenuHint}>
            {t("workspace.optionRemovalNote")}
          </p>
        </div>
      )}

      <div className={styles.columnMenuActions}>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={onDelete}
          disabled={!canDelete}
          title={canDelete ? t("workspace.deleteColumn") : t("workspace.needOneColumn")}
        >
          {t("workspace.deleteColumn")}
        </button>
        <button type="button" className={styles.ghostButton} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

/** One cell, rendered as the input appropriate to its column type. */
function Cell({ column, value, onChange }) {
  switch (column.type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          className={styles.cellCheckbox}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );

    case "select":
      return (
        <select
          className={styles.cellInput}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {(column.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case "date":
      return (
        <input
          type="date"
          className={styles.cellInput}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <input
          type="number"
          className={styles.cellInput}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return (
        <input
          type="text"
          className={styles.cellInput}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
